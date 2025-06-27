import schema from '../schema.json';

// Schema bit positions according to specification
export const SCHEMA = {
  action: {  // bits 24-29 (6 bits, most significant)
    bits: 6,
    values: {
      0: "acknowledge",
      1: "activate",
      2: "alert",
      3: "assemble",
      4: "authorize",
      5: "backup",
      6: "broadcast",
      7: "cancel",
      8: "capture",
      9: "check",
      10: "collect",
      11: "command",
      12: "compromise",
      13: "confirm",
      14: "connect",
      15: "contact",
      16: "continue",
      17: "copy",
      18: "decrypt",
      19: "deploy",
      20: "disable",
      21: "disconnect",
      22: "disrupt",
      23: "download",
      24: "enable",
      25: "encrypt",
      26: "engage",
      27: "escalate",
      28: "evacuate",
      29: "execute",
      30: "extract",
      31: "forward",
      32: "gather",
      33: "hide",
      34: "hold",
      35: "identify",
      36: "initiate",
      37: "inspect",
      38: "intercept",
      39: "locate",
      40: "lock",
      41: "log",
      42: "maintain",
      43: "meet",
      44: "move",
      45: "monitor",
      46: "neutralize",
      47: "observe",
      48: "override",
      49: "pause",
      50: "ping",
      51: "prepare",
      52: "reboot",
      53: "record",
      54: "redirect",
      55: "report",
      56: "request",
      57: "rescue",
      58: "reset",
      59: "restart",
      60: "retrieve",
      61: "revoke",
      62: "scan",
      63: "send"
    }
  },
  target: {  // bits 18-23 (6 bits)
    bits: 6,
    values: {
      0: "access key",
      1: "account",
      2: "activation code",
      3: "agent",
      4: "antenna array",
      5: "asset",
      6: "authorization request",
      7: "backup drive",
      8: "beacon",
      9: "blueprint",
      10: "checkpoint",
      11: "covert asset",
      12: "data cache",
      13: "data stream",
      14: "device",
      15: "digital wallet",
      16: "drone",
      17: "emergency contact",
      18: "encrypted file",
      19: "entry point",
      20: "escape plan",
      21: "file",
      22: "firewall",
      23: "flag",
      24: "footage",
      25: "gateway",
      26: "geo coordinate",
      27: "guard",
      28: "handshake",
      29: "injection script",
      30: "journal",
      31: "key material",
      32: "laptop",
      33: "location",
      34: "log entry",
      35: "manifest",
      36: "meeting request",
      37: "message",
      38: "mission log",
      39: "node",
      40: "objective",
      41: "operation directive",
      42: "passphrase",
      43: "payload",
      44: "personal token",
      45: "report",
      46: "rescue code",
      47: "route",
      48: "satellite",
      49: "scan",
      50: "server",
      51: "signal",
      52: "software",
      53: "supply crate",
      54: "team",
      55: "terminal",
      56: "threat signature",
      57: "tracking beacon",
      58: "transport",
      59: "unit",
      60: "vault",
      61: "vehicle",
      62: "safe house",
      63: "relay node"
    }
  },
  when: {  // bits 5-17 (13 bits)
    bits: 13,
    modifiers: {
      0: "exact",
      1: "before",
      2: "after",
      3: "approximate"
    }
  },
  where: {  // bits 1-4 (4 bits)
    bits: 4,
    values: {
      0: "HQ",
      1: "Field Camp",
      2: "Zone 1",
      3: "Zone 2",
      4: "Zone 3",
      5: "Safe House",
      6: "Extraction Point",
      7: "Embassy",
      8: "Airport",
      9: "Seaport",
      10: "Bridge",
      11: "Tunnel",
      12: "Urban Area",
      13: "Rural Area",
      14: "Mountain Pass",
      15: "Desert"
    }
  },
  flags: {  // bit 0 (1 bit, least significant)
    bits: 1,
    values: {
      0: "stealth",
      1: "urgent"
    }
  }
};

// Decode flags function
export function decodeFlags(value) {
  return [SCHEMA.flags.values[value]];
}

// Add decode function to flags
SCHEMA.flags.decode = decodeFlags;

// Export other functions
export function decodeMessage(value) {
  try {
    // Ensure value is a number and within 30-bit range
    const intValue = parseInt(value);
    if (isNaN(intValue) || intValue < 0 || intValue >= Math.pow(2, schema.schema_bits)) {
      throw new Error('Invalid message value');
    }

    // Convert to binary string for logging
    const binaryStr = intValue.toString(2).padStart(schema.schema_bits, '0');
    console.log('=============== DECODING START ===============');
    console.log('Input value (decimal):', intValue);
    console.log('Input value (hex):', '0x' + intValue.toString(16));
    console.log('Full binary:', binaryStr);
    
    const decoded = {};
    
    // Extract each field with detailed logging
    const action = (intValue >> 24) & 0x3F;
    const target = (intValue >> 18) & 0x3F;
    const when = (intValue >> 5) & 0x1FFF;
    const where = (intValue >> 1) & 0xF;
    const flags = intValue & 0x1;

    // Extract time components from when field
    let hour = (when >> 8) & 0x1F;    // Top 5 bits
    let minute = (when >> 2) & 0x3F;  // Middle 6 bits
    const modifier = when & 0x3;        // Bottom 2 bits

    // Validate time components
    if (hour > 23) hour = 23;
    if (minute > 59) minute = 59;

    // Decode each field
    decoded.action = schema.fields.action.entries[action.toString()] || `unknown(${action})`;
    decoded.target = schema.fields.target.entries[target.toString()] || `unknown(${target})`;
    decoded.when = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    if (modifier > 0) {
      const modType = schema.fields.when.subfields.modifier.entries[modifier.toString()];
      if (modType && modType !== 'exact') {
        decoded.when = modType + ' ' + decoded.when;
      }
    }
    decoded.where = schema.fields.where.entries[where.toString()] || `unknown(${where})`;
    decoded.flags = [schema.fields.flags.entries[flags.toString()]];

    console.log('\nDECODED VALUES:', decoded);
    console.log('=============== DECODING END ===============\n');
    return decoded;
  } catch (error) {
    console.error('Failed to decode message:', error);
    return null;
  }
}

export function formatDecodedMessage(decoded) {
  if (!decoded) return 'Invalid message format';

  try {
    const parts = [];
    if (decoded.action) parts.push(`Action: ${decoded.action}`);
    if (decoded.target) parts.push(`Target: ${decoded.target}`);
    if (decoded.when) parts.push(`When: ${decoded.when}`);
    if (decoded.where) parts.push(`Where: ${decoded.where}`);
    if (decoded.flags && decoded.flags.length > 0) {
      parts.push(`Flags: ${decoded.flags.join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Invalid message format';
  } catch (error) {
    console.error('Error formatting decoded message:', error);
    return 'Error formatting message';
  }
}

// Helper function to create a test value
export function createTestValue(action, target, hour, minute, where, flags = 0, modifier = 0) {
  // Validate inputs
  if (hour < 0 || hour > 23) throw new Error('Hour must be 0-23');
  if (minute < 0 || minute > 59) throw new Error('Minute must be 0-59');
  if (action < 0 || action > 63) throw new Error('Action must be 0-63');
  if (target < 0 || target > 63) throw new Error('Target must be 0-63');
  if (where < 0 || where > 15) throw new Error('Where must be 0-15');
  if (flags < 0 || flags > 1) throw new Error('Flags must be 0 or 1');
  if (modifier < 0 || modifier > 3) throw new Error('Modifier must be 0-3');
  
  // Pack the bits according to schema (MSB to LSB)
  const whenValue = ((hour & 0x1F) << 8) | ((minute & 0x3F) << 2) | (modifier & 0x3);
  
  let value = 0;
  value |= ((action & 0x3F) << 24);  // action (bits 24-29)
  value |= ((target & 0x3F) << 18);  // target (bits 18-23)
  value |= ((whenValue & 0x1FFF) << 5);  // when (bits 5-17)
  value |= ((where & 0xF) << 1);  // where (bits 1-4)
  value |= (flags & 0x1);  // flags (bit 0)

  // Validate final value is within schema bit range
  const MAX_VALUE = Math.pow(2, schema.schema_bits) - 1;
  if (value < 0 || value > MAX_VALUE) {
    throw new Error(`Generated value ${value} exceeds ${schema.schema_bits}-bit range (0 to ${MAX_VALUE})`);
  }

  return value;
} 