import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { openai } from '../services/openai';

const MessageList = styled(List)({
  height: '300px',
  overflow: 'auto',
  marginBottom: 2,
  padding: 2,
});

const KeyField = styled(TextField)({
  marginBottom: 2,
});

const LoadingDots = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
};

const MessageItem = styled(ListItem)(({ theme, error }) => ({
  backgroundColor: error ? theme.palette.error.dark : 'transparent',
  '&:hover': {
    backgroundColor: error ? theme.palette.error.main : theme.palette.action.hover,
  },
}));

const InterpretationDialog = ({ open, interpretation, onConfirm, onCancel }) => {
  if (!interpretation) return null;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Message Interpretation</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {interpretation.explanation}
        </Typography>
        <Box sx={{ mt: 2, mb: 2, fontFamily: 'monospace' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Interpreted as:
          </Typography>
          <Typography>Action: {interpretation.matches.action}</Typography>
          <Typography>Target: {interpretation.matches.target}</Typography>
          <Typography>When: {interpretation.matches.timeModifier} {interpretation.matches.when}</Typography>
          <Typography>Where: {interpretation.matches.where}</Typography>
          <Typography>Flags: {interpretation.matches.flags}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="error">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          Confirm & Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MessengerWindow = ({
  title,
  messages,
  onMessageSend,
  privateKey,
  publicKey,
  dictatorPublicKey,
  alicePrivateKey,
  onKeysChange,
  role,
  keyPhase = false,
  readOnly = false,
  allowSecretMessage = false
}) => {
  const [publicMessageInput, setPublicMessageInput] = useState('');
  const [secretMessageInput, setSecretMessageInput] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [error, setError] = useState('');
  const [interpretation, setInterpretation] = useState(null);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatMessage = (msg) => {
    try {
      if (!msg || !msg.text) {
        return 'Invalid message';
      }

      // For Alice's window, only show secret messages
      if (role === 'alice' && !msg.loading && !msg.text.includes('Action:')) {
        return null;
      }

      // Handle loading state with animated dots
      if (msg.loading) {
        return (
          <Typography variant="body1">
            Decrypting secret message<LoadingDots />
          </Typography>
        );
      }

      // Handle error state
      if (msg.error) {
        return (
          <Typography color="error">
            Error: {msg.text}
          </Typography>
        );
      }

      // Format decoded messages nicely
      if (msg.text.includes('Action:')) {
        const parts = msg.text.split(' | ');
        return (
          <Box>
            {parts.map((part, index) => (
              <Typography 
                key={index} 
                variant="body1" 
                sx={{ 
                  fontFamily: 'monospace',
                  color: part.includes('urgent') ? 'error.main' : 'inherit'
                }}
              >
                {part}
              </Typography>
            ))}
          </Box>
        );
      }

      return msg.text;
    } catch (error) {
      console.error('Error in formatMessage:', error);
      return 'Error formatting message';
    }
  };

  const handleInterpret = async () => {
    try {
      setError('');
      setIsProcessing(true);

      const result = await openai.interpretMessage(naturalLanguageInput);
      setInterpretation(result);
      setShowInterpretation(true);
      setSecretMessageInput(result.cm);
    } catch (err) {
      setError('Failed to interpret message: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmInterpretation = async () => {
    try {
      setShowInterpretation(false);
      await handleSend(true);
      setNaturalLanguageInput('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleSend = async (isInterpreted = false) => {
    try {
      setError('');
      
      if (role === 'bob') {
        if (!dictatorPublicKey || !alicePrivateKey) {
          setError('Both Dictator public key and Alice private key are required');
          return;
        }

        if (!isInterpreted) {
          // If not already interpreted, validate as 30-bit integer
          const secretInt = parseInt(secretMessageInput);
          if (isNaN(secretInt) || secretInt < 0 || secretInt >= Math.pow(2, 30)) {
            setError('Secret message must be a 30-bit integer (0 to 1,073,741,823)');
            return;
          }
        }
        
        await onMessageSend(publicMessageInput, parseInt(secretMessageInput), 'bob');
        setPublicMessageInput('');
        setSecretMessageInput('');
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleKeyChange = (type, value) => {
    if (onKeysChange) {
      onKeysChange(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  // Filter messages for Alice's window
  const displayMessages = role === 'alice' 
    ? messages.filter(msg => msg.loading || msg.text.includes('Action:'))
    : messages;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {/* Key input fields for Dictator and Alice during key phase */}
      {keyPhase && role !== 'bob' && (
        <Box sx={{ mb: 2 }}>
          <KeyField
            fullWidth
            label="Private Key"
            value={privateKey}
            onChange={(e) => handleKeyChange('privateKey', e.target.value)}
            size="small"
            margin="dense"
          />
          <KeyField
            fullWidth
            label="Public Key"
            value={publicKey}
            onChange={(e) => handleKeyChange('publicKey', e.target.value)}
            size="small"
            margin="dense"
          />
        </Box>
      )}

      <MessageList>
        {displayMessages.map((msg, index) => {
          const formattedMessage = formatMessage(msg);
          if (formattedMessage === null) return null;
          
          return (
            <React.Fragment key={index}>
              <MessageItem error={msg.error}>
                <ListItemText
                  primary={formattedMessage}
                  secondary={`${msg.sender} - ${new Date(msg.timestamp).toLocaleTimeString()}`}
                />
              </MessageItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </MessageList>

      {!keyPhase && !readOnly && (
        <Box sx={{ mt: 'auto' }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
          
          <TextField
            fullWidth
            label="Public Message (to Dictator)"
            value={publicMessageInput}
            onChange={(e) => setPublicMessageInput(e.target.value)}
            margin="dense"
            size="small"
          />

          {allowSecretMessage && (
            <>
              <TextField
                fullWidth
                label="Natural Language Secret Message"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                margin="dense"
                size="small"
                multiline
                rows={2}
                helperText="Describe your secret message in natural language"
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={handleInterpret}
                sx={{ mt: 1 }}
                disabled={!naturalLanguageInput.trim() || isProcessing}
              >
                {isProcessing ? 'Interpreting...' : 'Interpret Message'}
              </Button>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                - OR -
              </Typography>
              <TextField
                fullWidth
                label="Raw Secret Message (30-bit integer)"
                value={secretMessageInput}
                onChange={(e) => setSecretMessageInput(e.target.value)}
                margin="dense"
                size="small"
                type="number"
                helperText="Enter a number between 0 and 1,073,741,823 (2^30 - 1)"
              />
            </>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={() => handleSend(false)}
            sx={{ mt: 1 }}
            disabled={!publicMessageInput.trim() || (allowSecretMessage && !secretMessageInput.trim())}
          >
            Send
          </Button>
        </Box>
      )}

      <InterpretationDialog
        open={showInterpretation}
        interpretation={interpretation}
        onConfirm={handleConfirmInterpretation}
        onCancel={() => setShowInterpretation(false)}
      />
    </Paper>
  );
};

export default MessengerWindow; 