import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Container, Grid, CssBaseline, Stepper, Step, StepLabel, Button, Typography } from '@mui/material';
import MessengerWindow from './components/MessengerWindow';
import { api } from './services/api';
import { decodeMessage, formatDecodedMessage } from './utils/schema';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [dictatorKeys, setDictatorKeys] = useState({
    privateKey: '',
    publicKey: ''
  });
  
  const [aliceKeys, setAliceKeys] = useState({
    privateKey: '',
    publicKey: ''
  });

  const [messages, setMessages] = useState({
    public: [], // Messages visible to all
    secret: [] // Secret messages only visible to Alice
  });

  const [error, setError] = useState('');

  // Validate keys before proceeding
  const validateKeys = () => {
    if (dictatorKeys.privateKey && dictatorKeys.publicKey && 
        aliceKeys.privateKey && aliceKeys.publicKey) {
      setActiveStep(1);
    }
  };

  const handleMessageSend = async (publicMessage, secretMessage, sender) => {
    try {
      setError(''); // Clear any previous errors
      if (sender === 'bob') {
        console.log('Sending messages:', {
          public: publicMessage,
          sender,
          keys: {
            dictatorPrivate: dictatorKeys.privateKey?.substring(0, 10) + '...',
            alicePrivate: aliceKeys.privateKey?.substring(0, 10) + '...'
          }
        });

        // First, encrypt the public message
        const publicResponse = await api.encrypt({
          dict_priv: dictatorKeys.privateKey,
          alice_priv: aliceKeys.privateKey,
          x: publicMessage,
          cm: '99' // Default cm for public message
        });

        console.log('Public message encrypted:', publicResponse);

        // Then encrypt the secret message with the provided 30-bit integer
        const secretResponse = await api.encrypt({
          dict_priv: dictatorKeys.privateKey,
          alice_priv: aliceKeys.privateKey,
          x: '5', // Default x for secret message
          cm: secretMessage.toString() // Use the 30-bit integer as cm
        });

        console.log('Secret message encrypted:', secretResponse);

        // Add public message to messages
        setMessages(prev => ({
          ...prev,
          public: [...prev.public, {
            text: publicMessage,
            sender,
            timestamp: new Date().toISOString()
          }]
        }));

        // Add initial secret message showing decryption has started
        setMessages(prev => ({
          ...prev,
          secret: [...prev.secret, {
            text: 'Decrypting secret message',
            sender,
            timestamp: new Date().toISOString(),
            loading: true,
            cipher: secretResponse.cipher // Store cipher for reference
          }]
        }));

        try {
          console.log('Starting Alice decryption (BSGS process, ~30s)');
          const decryptedMessage = await api.decryptAlice({
            alice_priv: aliceKeys.privateKey,
            cipher: secretResponse.cipher
          });

          console.log('Successfully decrypted Alice message:', decryptedMessage);

          // Extract CM from decryption output
          const cmMatch = decryptedMessage.output.match(/Alice recovered index \(cm\): (\d+)/);
          const recoveredCM = cmMatch ? cmMatch[1] : null;

          if (recoveredCM) {
            // Now that we have the actual CM from decryption, decode it
            const decoded = decodeMessage(recoveredCM);
            const formattedMessage = decoded ? formatDecodedMessage(decoded) : 'Failed to decode message';

            // Update the message with the decrypted and decoded result
            setMessages(prev => ({
              ...prev,
              secret: prev.secret.map(msg => 
                msg.loading ? {
                  text: formattedMessage,
                  sender,
                  timestamp: new Date().toISOString(),
                  error: !decoded
                } : msg
              )
            }));
          } else {
            throw new Error('Failed to extract CM from decryption output');
          }
        } catch (error) {
          console.error('Failed to decrypt Alice message:', error);
          setError(`Failed to decrypt Alice message: ${error.message}`);
          
          // Update the message to show error without leaking CM
          setMessages(prev => ({
            ...prev,
            secret: prev.secret.map(msg => 
              msg.loading ? {
                text: `Failed to decrypt secret message - ${error.message}`,
                sender,
                timestamp: new Date().toISOString(),
                error: true
              } : msg
            )
          }));
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError(`Failed to send message: ${error.message}`);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Enter Keys</StepLabel>
          </Step>
          <Step>
            <StepLabel>Messaging</StepLabel>
          </Step>
        </Stepper>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {activeStep === 0 ? (
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MessengerWindow 
                  title="Dictator"
                  messages={[]}
                  privateKey={dictatorKeys.privateKey}
                  publicKey={dictatorKeys.publicKey}
                  onKeysChange={setDictatorKeys}
                  role="dictator"
                  keyPhase={true}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MessengerWindow 
                  title="Alice"
                  messages={[]}
                  privateKey={aliceKeys.privateKey}
                  publicKey={aliceKeys.publicKey}
                  onKeysChange={setAliceKeys}
                  role="alice"
                  keyPhase={true}
                />
              </Grid>
            </Grid>
            <Button 
              variant="contained" 
              onClick={validateKeys}
              disabled={!dictatorKeys.privateKey || !dictatorKeys.publicKey || 
                       !aliceKeys.privateKey || !aliceKeys.publicKey}
              sx={{ mt: 2 }}
            >
              Proceed to Messaging
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <MessengerWindow 
                title="Dictator"
                messages={messages.public}
                privateKey={dictatorKeys.privateKey}
                publicKey={dictatorKeys.publicKey}
                role="dictator"
                readOnly={true}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <MessengerWindow 
                title="Alice"
                messages={messages.secret}
                privateKey={aliceKeys.privateKey}
                publicKey={aliceKeys.publicKey}
                role="alice"
                readOnly={true}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <MessengerWindow 
                title="Bob"
                messages={messages.public}
                dictatorPublicKey={dictatorKeys.publicKey}
                alicePrivateKey={aliceKeys.privateKey}
                onMessageSend={handleMessageSend}
                role="bob"
                allowSecretMessage={true}
              />
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App; 