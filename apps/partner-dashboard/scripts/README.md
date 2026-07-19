# Partner Dashboard Scripts

This directory contains administrative scripts for managing the Partner Dashboard.

## Set Partner Role Script

The `set-partner-role.js` script allows you to manage partner roles for users.

### Setup

1. **Get your Firebase service account key:**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely (e.g., `serviceAccountKey.json`)

2. **Set the environment variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
   ```

   Or add it to your shell profile (`.bashrc`, `.zshrc`, etc.):
   ```bash
   echo 'export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Usage

**Set partner role for a user:**
```bash
node scripts/set-partner-role.js set admin@example.com
```

**Remove partner role from a user:**
```bash
node scripts/set-partner-role.js remove admin@example.com
```

**List all users with partner role:**
```bash
node scripts/set-partner-role.js list
```

**Get help:**
```bash
node scripts/set-partner-role.js
```

### Important Notes

- Users must **sign out and sign back in** after their role is changed for the changes to take effect
- The user must already exist in Firebase Authentication (they need to register first)
- Keep your service account key JSON file secure and never commit it to version control
- Add `serviceAccountKey.json` to your `.gitignore` file

### Example Workflow

1. User registers in the app
2. You verify they should have partner access
3. Run the script to grant them partner role:
   ```bash
   node scripts/set-partner-role.js set their-email@example.com
   ```
4. User signs out and signs back in
5. User can now access the Partner Dashboard at `http://localhost:3001`

### Troubleshooting

**Error: "GOOGLE_APPLICATION_CREDENTIALS environment variable not set"**
- Make sure you've exported the environment variable
- Check that the path to your service account JSON file is correct

**Error: "User not found"**
- The user must register in your app first before you can grant them partner role
- Double-check the email address for typos

**Error: "Permission denied"**
- Your service account may not have the necessary permissions
- Make sure you're using the service account key from the correct Firebase project
