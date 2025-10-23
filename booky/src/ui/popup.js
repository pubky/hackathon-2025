/**
 * Popup UI Script
 */

// Get references to DOM elements
const setupScreen = document.getElementById('setup-screen');
const mainScreen = document.getElementById('main-screen');
const loading = document.getElementById('loading');

const setupButton = document.getElementById('setup-button');
const importButton = document.getElementById('import-button');
const recoveryFileInput = document.getElementById('recovery-file-input');
const signinRecoveryCodeButton = document.getElementById('signin-recovery-code-button');
const recoveryCodeInputSection = document.getElementById('recovery-code-input-section');
const recoveryCodeInput = document.getElementById('recovery-code-input');
const signinWithCodeButton = document.getElementById('signin-with-code-button');
const cancelCodeSigninButton = document.getElementById('cancel-code-signin-button');
const homeserverInput = document.getElementById('homeserver');
const inviteCodeInput = document.getElementById('invite-code');
const setupResult = document.getElementById('setup-result');
const generatedPubkey = document.getElementById('generated-pubkey');
const generatedFolder = document.getElementById('generated-folder');

const userPubkey = document.getElementById('user-pubkey');
const userFolder = document.getElementById('user-folder');
const monitorPubkeyInput = document.getElementById('monitor-pubkey');
const addPubkeyButton = document.getElementById('add-pubkey-button');
const foldersList = document.getElementById('folders-list');
const manualSyncButton = document.getElementById('manual-sync-button');
const exportButton = document.getElementById('export-button');
const copyRecoveryCodeMainButton = document.getElementById('copy-recovery-code-main-button');
const signOutButton = document.getElementById('sign-out-button');

// Passphrase modal elements
const passphraseModal = document.getElementById('passphrase-modal');
const passphraseInput = document.getElementById('passphrase-input');
const confirmPassphraseButton = document.getElementById('confirm-passphrase');
const cancelPassphraseButton = document.getElementById('cancel-passphrase');
const closePassphraseModalButton = document.getElementById('close-passphrase-modal');

// Browser API compatibility
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

// Modal state
let currentOperation = null;
let pendingRecoveryFileContent = null;
let pendingHomeserver = null;
let pendingInviteCode = null;

/**
 * Initialize popup
 */
async function init() {
  showLoading();

  try {
    // Get status from background
    const response = await sendMessage({ action: 'getStatus' });

    if (response.success) {
      if (response.data.setup) {
        showMainScreen(response.data);
      } else {
        showSetupScreen();
      }
    } else {
      showError('Failed to get status');
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError(error.message);
  }
}

/**
 * Show loading indicator
 */
function showLoading() {
  loading.style.display = 'block';
  setupScreen.style.display = 'none';
  mainScreen.style.display = 'none';
}

/**
 * Show setup screen
 */
function showSetupScreen() {
  loading.style.display = 'none';
  setupScreen.style.display = 'block';
  mainScreen.style.display = 'none';
}

/**
 * Show main screen
 */
function showMainScreen(data) {
  loading.style.display = 'none';
  setupScreen.style.display = 'none';
  mainScreen.style.display = 'block';

  // Display user info - full pubkey
  userPubkey.textContent = data.pubkey;
  userPubkey.title = 'Click to copy';
  userPubkey.style.cursor = 'pointer';
  
  // Make pubkey copyable
  userPubkey.onclick = () => copyToClipboard(data.pubkey, 'Public key copied!');
  
  userFolder.textContent = data.folderName;

  // Display synced folders
  displayFolders(data);
}

/**
 * Display synced folders
 */
function displayFolders(data) {
  foldersList.innerHTML = '';

  // Add main folder
  const mainFolder = createFolderItem(
    data.folderName,
    data.pubkey,
    data.syncStatuses[data.pubkey],
    false
  );
  foldersList.appendChild(mainFolder);

  // Add monitored folders
  for (const pubkey of data.monitored) {
    const folderName = `pub_${pubkey.substring(0, 7)}`;
    const status = data.syncStatuses[pubkey] || { status: 'pending' };
    const folderItem = createFolderItem(folderName, pubkey, status, true);
    foldersList.appendChild(folderItem);
  }
}

/**
 * Create folder item element
 */
function createFolderItem(folderName, pubkey, status, canRemove) {
  const item = document.createElement('div');
  item.className = 'folder-item';

  const info = document.createElement('div');
  info.className = 'folder-info';

  const name = document.createElement('div');
  name.className = 'folder-name';
  name.textContent = folderName;

  const pubkeyEl = document.createElement('div');
  pubkeyEl.className = 'folder-pubkey';
  pubkeyEl.textContent = pubkey.substring(0, 20) + '...';

  info.appendChild(name);
  info.appendChild(pubkeyEl);

  const statusContainer = document.createElement('div');
  statusContainer.className = 'folder-status';

  const statusIcon = createStatusIcon(status);
  statusContainer.appendChild(statusIcon);

  if (canRemove) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-button';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removePubkey(pubkey);
    statusContainer.appendChild(removeBtn);
  }

  item.appendChild(info);
  item.appendChild(statusContainer);

  return item;
}

/**
 * Create status icon
 */
function createStatusIcon(status) {
  const icon = document.createElement('span');
  icon.className = 'status-icon';

  switch (status.status) {
    case 'synced':
      icon.className += ' status-synced';
      icon.textContent = '✓';
      icon.title = 'Synced';
      break;
    case 'syncing':
      icon.className += ' status-syncing';
      icon.textContent = '↻';
      icon.title = 'Syncing...';
      break;
    case 'error':
      icon.className += ' status-error';
      icon.textContent = '✗';
      icon.title = status.error || 'Error occurred';
      break;
    default:
      icon.textContent = '○';
      icon.title = 'Pending';
  }

  return icon;
}

/**
 * Show toast message
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;

  const app = document.getElementById('app');
  app.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;

  const app = document.getElementById('app');
  app.appendChild(errorDiv);

  setTimeout(() => errorDiv.remove(), 5000);
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve) => {
    browserAPI.runtime.sendMessage(message, resolve);
  });
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text, successMessage) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMessage);
  }).catch(err => {
    console.error('Failed to copy:', err);
    showError('Failed to copy to clipboard');
  });
}

/**
 * Handle setup
 */
async function handleSetup() {
  const homeserver = homeserverInput.value.trim();
  const inviteCode = inviteCodeInput.value.trim() || null;

  // Validate homeserver
  if (!homeserver) {
    showError('Please enter a homeserver public key');
    return;
  }

  setupButton.disabled = true;
  setupButton.textContent = 'Setting up...';

  try {
    const response = await sendMessage({
      action: 'setup',
      homeserver: homeserver,
      inviteCode: inviteCode
    });

    if (response.success) {
      // Get status to show result
      const statusResponse = await sendMessage({ action: 'getStatus' });
      if (statusResponse.success && statusResponse.data.setup) {
        generatedPubkey.textContent = statusResponse.data.pubkey;
        generatedFolder.textContent = statusResponse.data.folderName;

        setupResult.style.display = 'block';

        // Switch to main screen after a delay
        setTimeout(() => {
          showMainScreen(statusResponse.data);
        }, 3000);
      }
    } else {
      // Show detailed error message
      const errorMsg = response.error || 'Setup failed';
      showError(errorMsg);
      setupButton.disabled = false;
      setupButton.textContent = 'Setup Booky';

      // Log for debugging
      console.error('Setup failed:', errorMsg);
    }
  } catch (error) {
    console.error('Setup error:', error);
    showError(error.message || 'Setup failed');
    setupButton.disabled = false;
    setupButton.textContent = 'Setup Booky';
  }
}

/**
 * Handle adding monitored pubkey
 */
async function handleAddPubkey() {
  const pubkey = monitorPubkeyInput.value.trim();

  if (!pubkey) {
    showError('Please enter a pubkey');
    return;
  }

  if (pubkey.length < 7) {
    showError('Invalid pubkey format');
    return;
  }

  addPubkeyButton.disabled = true;
  addPubkeyButton.textContent = 'Adding...';

  try {
    const response = await sendMessage({
      action: 'addMonitoredPubkey',
      pubkey: pubkey
    });

    if (response.success) {
      monitorPubkeyInput.value = '';

      // Refresh display
      const statusResponse = await sendMessage({ action: 'getStatus' });
      if (statusResponse.success) {
        displayFolders(statusResponse.data);
      }
    } else {
      showError(response.error || 'Failed to add public key');
    }
  } catch (error) {
    console.error('Add pubkey error:', error);
    showError(error.message);
  } finally {
    addPubkeyButton.disabled = false;
    addPubkeyButton.textContent = 'Add';
  }
}

/**
 * Handle removing monitored pubkey
 */
async function removePubkey(pubkey) {
  if (!confirm(`Remove ${pubkey.substring(0, 20)}... from monitoring?`)) {
    return;
  }

  try {
    const response = await sendMessage({
      action: 'removeMonitoredPubkey',
      pubkey: pubkey
    });

    if (response.success) {
      // Refresh display
      const statusResponse = await sendMessage({ action: 'getStatus' });
      if (statusResponse.success) {
        displayFolders(statusResponse.data);
      }
    } else {
      showError(response.error || 'Failed to remove public key');
    }
  } catch (error) {
    console.error('Remove pubkey error:', error);
    showError(error.message);
  }
}

/**
 * Handle manual sync
 */
async function handleManualSync() {
  manualSyncButton.disabled = true;
  manualSyncButton.textContent = 'Syncing...';

  try {
    const response = await sendMessage({ action: 'manualSync' });

    if (response.success) {
      // Refresh display after a delay
      setTimeout(async () => {
        const statusResponse = await sendMessage({ action: 'getStatus' });
        if (statusResponse.success) {
          displayFolders(statusResponse.data);
        }
      }, 1000);
    } else {
      showError(response.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Manual sync error:', error);
    showError(error.message);
  } finally {
    manualSyncButton.disabled = false;
    manualSyncButton.textContent = 'Sync Now';
  }
}

/**
 * Handle export recovery file
 */
async function handleExportRecoveryFile() {
  // Show passphrase modal for export
  showPassphraseModal('exportRecoveryFile');
}

/**
 * Handle import recovery file button click
 */
function handleImportRecoveryFile() {
  recoveryFileInput.click();
}

/**
 * Handle recovery file selection
 */
async function handleRecoveryFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Read the file as ArrayBuffer first
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
    
    // Convert ArrayBuffer to Uint8Array as expected by Pubky SDK
    const recoveryBytes = new Uint8Array(arrayBuffer);
    
    // Get homeserver and invite code from inputs
    const homeserver = homeserverInput.value.trim();
    const inviteCode = inviteCodeInput.value.trim() || null;
    
    if (!homeserver) {
      showError('Please enter a homeserver public key');
      return;
    }

    // Show passphrase modal instead of directly importing
    showPassphraseModal('importRecoveryFile', Array.from(recoveryBytes), homeserver, inviteCode);
  } catch (error) {
    console.error('Error reading recovery file:', error);
    showError('Invalid recovery file format');
    showSetupScreen();
  }
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  if (!confirm('Are you sure you want to sign out? This will remove your keys from local storage. Make sure you have downloaded your recovery file first!')) {
    return;
  }

  signOutButton.disabled = true;
  signOutButton.textContent = 'Signing out...';

  try {
    const response = await sendMessage({ action: 'signOut' });

    if (response.success) {
      showToast('Signed out successfully');
      // Reload popup to show setup screen
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showError(response.error || 'Sign out failed');
      signOutButton.disabled = false;
      signOutButton.textContent = 'Sign Out';
    }
  } catch (error) {
    console.error('Sign out error:', error);
    showError(error.message);
    signOutButton.disabled = false;
    signOutButton.textContent = 'Sign Out';
  }
}

/**
 * Show recovery code input section
 */
function showRecoveryCodeInput() {
  // Hide the setup form and result, but keep setup screen visible
  document.querySelector('.setup-form').style.display = 'none';
  setupResult.style.display = 'none';
  recoveryCodeInputSection.style.display = 'block';
}

/**
 * Hide recovery code input section
 */
function hideRecoveryCodeInput() {
  recoveryCodeInputSection.style.display = 'none';
  document.querySelector('.setup-form').style.display = 'block';
  recoveryCodeInput.value = '';
}

/**
 * Handle sign in with recovery code
 */
async function handleSignInWithRecoveryCode() {
  const recoveryCode = recoveryCodeInput.value.trim();

  if (!recoveryCode) {
    showError('Please enter a recovery code');
    return;
  }

  signinWithCodeButton.disabled = true;
  signinWithCodeButton.textContent = 'Signing in...';

  try {
    const response = await sendMessage({
      action: 'signInWithRecoveryCode',
      recoveryCode: recoveryCode
    });

    if (response.success) {
      showToast('Signed in successfully');
      // Reload popup to show main screen
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showError(response.error || 'Sign in failed');
      signinWithCodeButton.disabled = false;
      signinWithCodeButton.textContent = 'Sign In';
    }
  } catch (error) {
    console.error('Sign in error:', error);
    showError(error.message);
    signinWithCodeButton.disabled = false;
    signinWithCodeButton.textContent = 'Sign In';
  }
}

/**
 * Handle copy recovery code from main screen
 */
async function handleCopyRecoveryCodeMain() {
  try {
    const response = await sendMessage({ action: 'getRecoveryCode' });
    if (response.success) {
      copyToClipboard(response.data, 'Recovery code copied to clipboard!');
    } else {
      showError('Failed to get recovery code');
    }
  } catch (error) {
    console.error('Error getting recovery code:', error);
    showError(error.message);
  }
}

/**
 * Show passphrase modal
 */
function showPassphraseModal(operation, recoveryFileContent = null, homeserver = null, inviteCode = null) {
  currentOperation = operation;
  pendingRecoveryFileContent = recoveryFileContent;
  pendingHomeserver = homeserver;
  pendingInviteCode = inviteCode;
  
  passphraseInput.value = '';
  passphraseModal.style.display = 'flex';
  passphraseInput.focus();
}

/**
 * Hide passphrase modal
 */
function hidePassphraseModal() {
  // Clear the file input so it can be triggered again if this was an import operation
  if (currentOperation === 'importRecoveryFile') {
    recoveryFileInput.value = '';
  }
  
  passphraseModal.style.display = 'none';
  currentOperation = null;
  pendingRecoveryFileContent = null;
  pendingHomeserver = null;
  pendingInviteCode = null;
  passphraseInput.value = '';
}

/**
 * Handle passphrase confirmation
 */
async function handlePassphraseConfirm() {
  const passphrase = passphraseInput.value.trim();
  
  // Allow empty passphrase (will use empty string)
  
  confirmPassphraseButton.disabled = true;
  confirmPassphraseButton.textContent = 'Processing...';
  
  try {
    if (currentOperation === 'importRecoveryFile') {
      const response = await sendMessage({
        action: 'importRecoveryFile',
        recoveryFileContent: pendingRecoveryFileContent,
        homeserver: pendingHomeserver,
        inviteCode: pendingInviteCode,
        passphrase: passphrase
      });
      
      if (response.success) {
        hidePassphraseModal();
        showToast('Recovery file imported successfully');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showError(response.error || 'Import failed');
        hidePassphraseModal();
        showSetupScreen();
      }
    } else if (currentOperation === 'exportRecoveryFile') {
      const response = await sendMessage({
        action: 'exportRecoveryFile',
        passphrase: passphrase
      });
      
      if (response.success) {
        hidePassphraseModal();
        // The recovery file data comes as a regular array from the message system
        // Convert it back to Uint8Array for proper binary file creation
        const binaryData = new Uint8Array(response.data);
        const blob = new Blob([binaryData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booky-recovery-${Date.now()}.pkarr`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Recovery file downloaded');
      } else {
        showError(response.error || 'Export failed');
        hidePassphraseModal();
      }
    }
  } catch (error) {
    console.error('Error processing with passphrase:', error);
    showError(error.message);
    hidePassphraseModal();
  } finally {
    confirmPassphraseButton.disabled = false;
    confirmPassphraseButton.textContent = 'Confirm';
  }
}

// Event listeners
setupButton.addEventListener('click', handleSetup);
importButton.addEventListener('click', handleImportRecoveryFile);
recoveryFileInput.addEventListener('change', handleRecoveryFileSelect);
signinRecoveryCodeButton.addEventListener('click', showRecoveryCodeInput);
signinWithCodeButton.addEventListener('click', handleSignInWithRecoveryCode);
cancelCodeSigninButton.addEventListener('click', hideRecoveryCodeInput);
addPubkeyButton.addEventListener('click', handleAddPubkey);
manualSyncButton.addEventListener('click', handleManualSync);
exportButton.addEventListener('click', handleExportRecoveryFile);
copyRecoveryCodeMainButton.addEventListener('click', handleCopyRecoveryCodeMain);
signOutButton.addEventListener('click', handleSignOut);

// Passphrase modal event listeners
confirmPassphraseButton.addEventListener('click', handlePassphraseConfirm);
cancelPassphraseButton.addEventListener('click', hidePassphraseModal);
closePassphraseModalButton.addEventListener('click', hidePassphraseModal);

// Handle Enter key in passphrase input
passphraseInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handlePassphraseConfirm();
  }
});

// Handle Escape key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && passphraseModal.style.display === 'flex') {
    hidePassphraseModal();
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

