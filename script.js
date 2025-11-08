// SMTP Simulator Class
class SMTPSimulator {
    constructor() {
        this.isRunning = false;
        this.totalPackets = 0;
        this.lostPackets = 0;
        this.retransmissions = 0;
        this.currentStep = 0;
        this.totalSteps = 5;
        this.isReceiverOnline = true; // Receiver status
        this.queuedEmails = []; // Emails waiting for receiver
    }

    /**
     * Generate timestamp for log entries
     * @returns {string} Current time in HH:MM:SS format
     */
    getTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0];
    }

    /**
     * Add a log entry to the console
     * @param {string} message - Log message
     * @param {string} type - Log type (info, command, response, error, warning, success)
     */
    log(message, type = 'info') {
        const logSection = document.getElementById('logSection');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `<span class="log-timestamp">[${this.getTimestamp()}]</span>${message}`;
        logSection.appendChild(entry);
        logSection.scrollTop = logSection.scrollHeight;
    }

    /**
     * Update the progress bar and status badge
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} status - Status text to display
     */
    updateProgress(percentage, status) {
        const progressFill = document.getElementById('progressFill');
        const statusBadge = document.getElementById('statusBadge');
        
        progressFill.style.width = percentage + '%';
        progressFill.textContent = Math.round(percentage) + '%';
        
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge ' + (
            percentage === 100 ? 'success' : 
            percentage === 0 ? 'idle' : 'processing'
        );
    }

    /**
     * Update receiver status display
     */
    updateReceiverStatus() {
        const receiverStatus = document.getElementById('receiverStatus');
        const recipientNode = document.getElementById('recipientNode');
        
        if (this.isReceiverOnline) {
            receiverStatus.textContent = '🟢 Online';
            receiverStatus.style.color = '#48bb78';
            recipientNode.style.opacity = '1';
        } else {
            receiverStatus.textContent = '🔴 Offline';
            receiverStatus.style.color = '#fc8181';
            recipientNode.style.opacity = '0.5';
        }
    }

    // Update statistics display
    updateStats() {
        document.getElementById('totalPackets').textContent = this.totalPackets;
        document.getElementById('lostPackets').textContent = this.lostPackets;
        document.getElementById('retransmissions').textContent = this.retransmissions;
        document.getElementById('queuedEmails').textContent = this.queuedEmails.length;
    }

    /**
     * Animate packet moving between nodes
     * @param {string} direction - 'right' or 'left'
     * @returns {Promise} Resolves when animation completes
     */
    async animatePacket(direction = 'right') {
        return new Promise((resolve) => {
            const packet = document.getElementById('packet');
            packet.style.display = 'block';
            packet.className = `packet moving-${direction}`;
            
            setTimeout(() => {
                packet.style.display = 'none';
                resolve();
            }, 2000);
        });
    }

    /**
     * Highlight active node in network diagram
     * @param {string} nodeId - ID of node to highlight (or null to clear all)
     */
    highlightNode(nodeId) {
        ['clientNode', 'smtpNode', 'recipientNode'].forEach(id => {
            document.getElementById(id).classList.remove('active');
        });
        if (nodeId) {
            document.getElementById(nodeId).classList.add('active');
        }
    }

    /**
     * Simulate packet transmission with possible loss and retransmission
     * @param {string} command - SMTP command being sent
     * @param {string} expectedResponse - Expected server response code
     * @param {number} networkDelay - Network delay in milliseconds
     * @param {number} packetLossRate - Packet loss rate percentage (0-100)
     * @returns {Promise<string>} Server response code
     */
    async sendPacket(command, expectedResponse, networkDelay, packetLossRate) {
        this.totalPackets++;
        this.updateStats();

        // Simulate packet loss based on configured rate
        const isLost = Math.random() * 100 < packetLossRate;
        
        if (isLost) {
            this.lostPackets++;
            this.updateStats();
            this.log(`⚠️ Packet lost during transmission of: ${command}`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.log(`🔄 Retransmitting packet...`, 'warning');
            this.retransmissions++;
            this.updateStats();
            
            // Retry transmission with reduced packet loss probability
            return await this.sendPacket(command, expectedResponse, networkDelay, packetLossRate * 0.3);
        }

        // Successful transmission
        await this.animatePacket('right');
        await new Promise(resolve => setTimeout(resolve, networkDelay));
        
        return expectedResponse;
    }

    /**
     * Validate email address format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Wait for receiver to come online
     * @param {Object} config - Email configuration
     * @returns {Promise} Resolves when receiver is online
     */
    async waitForReceiverOnline(config) {
        // This function is no longer used in the main flow
        // Kept for backward compatibility
        return Promise.resolve();
    }

    /**
     * Process all queued emails when receiver comes online
     */
    async processQueuedEmails() {
        if (this.queuedEmails.length === 0) return;
        
        this.log(`🚀 Processing ${this.queuedEmails.length} queued email(s)...`, 'success');
        
        // Create a copy of the queue to process
        const emailsToProcess = [...this.queuedEmails];
        this.queuedEmails = [];
        this.updateStats();
        
        // Process each email
        for (const email of emailsToProcess) {
            this.log(`📬 Delivering queued email [ID: ${email.id}] to ${email.recipient}...`, 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Animate delivery
            await this.animatePacket('right');
            this.highlightNode('recipientNode');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.log(`✅ Email [ID: ${email.id}] delivered successfully!`, 'success');
            
            // Resolve the original promise
            if (email.resolve) {
                email.resolve();
            }
        }
        
        this.log(`🎉 All ${emailsToProcess.length} queued email(s) delivered!`, 'success');
    }

    /**
     * Main email sending simulation using SMTP protocol
     * @param {Object} config - Configuration object containing email and network settings
     */
    async sendEmail(config) {
        // Prevent multiple simultaneous simulations when online
        if (this.isRunning && this.isReceiverOnline) return;
        
        this.isRunning = true;
        this.totalPackets = 0;
        this.lostPackets = 0;
        this.retransmissions = 0;
        this.currentStep = 0;
        this.updateStats();

        // Clear previous log only when online
        if (this.isReceiverOnline) {
            document.getElementById('logSection').innerHTML = '';
        }
        
        // Disable send button during simulation
        document.getElementById('sendBtn').disabled = true;

        try {
            this.log('=== Starting SMTP Session ===', 'command');
            this.updateProgress(0, 'Connecting...');

            const serverDelay = config.serverDelay * 1000;
            const networkDelay = config.networkDelay;
            const packetLossRate = config.packetLoss;

            // STEP 1: HELO - Client Introduction
            this.currentStep = 1;
            this.updateProgress(20, 'Handshake');
            this.highlightNode('clientNode');
            this.log('→ CLIENT: HELO client.example.com', 'command');
            
            await this.sendPacket('HELO client.example.com', '250 OK', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));
            this.log('← SERVER: 250 Hello client.example.com', 'response');

            // STEP 2: MAIL FROM - Sender Declaration
            this.currentStep = 2;
            this.updateProgress(40, 'Sender Verification');
            this.highlightNode('clientNode');
            this.log(`→ CLIENT: MAIL FROM:<${config.sender}>`, 'command');
            
            await this.sendPacket(`MAIL FROM:<${config.sender}>`, '250 OK', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));
            this.log('← SERVER: 250 Sender OK', 'response');

            // STEP 3: RCPT TO - Recipient Validation
            this.currentStep = 3;
            this.updateProgress(60, 'Recipient Validation');
            this.highlightNode('clientNode');
            this.log(`→ CLIENT: RCPT TO:<${config.recipient}>`, 'command');
            
            await this.sendPacket(`RCPT TO:<${config.recipient}>`, '250 OK', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));

            // Validate recipient email address
            if (!this.isValidEmail(config.recipient) || config.recipient.includes('invalid')) {
                this.log('← SERVER: 550 Invalid recipient address', 'error');
                this.updateProgress(60, 'Failed');
                throw new Error('Invalid recipient address');
            }

            this.log('← SERVER: 250 Recipient OK', 'response');

            // STEP 4: DATA - Email Content Transmission
            this.currentStep = 4;
            this.updateProgress(70, 'Transmitting Message');
            this.highlightNode('clientNode');
            this.log('→ CLIENT: DATA', 'command');
            
            await this.sendPacket('DATA', '354', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));
            this.log('← SERVER: 354 Start mail input; end with <CRLF>.<CRLF>', 'response');

            // Send email headers and content
            this.highlightNode('clientNode');
            this.log(`→ CLIENT: Subject: ${config.subject}`, 'command');
            this.log(`→ CLIENT: From: ${config.sender}`, 'command');
            this.log(`→ CLIENT: To: ${config.recipient}`, 'command');
            
            if (config.attachment) {
                this.log(`→ CLIENT: Attachment: ${config.attachment}`, 'command');
            }
            
            // Show truncated message body in log
            const bodyPreview = config.body.length > 50 
                ? config.body.substring(0, 50) + '...' 
                : config.body;
            this.log(`→ CLIENT: [Message Body: ${bodyPreview}]`, 'command');
            this.log('→ CLIENT: .', 'command');
            
            await this.sendPacket('EMAIL_CONTENT', '250', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));
            this.log('← SERVER: 250 Message accepted and stored in queue', 'response');

            // Check if receiver is online
            this.updateProgress(80, 'Checking Receiver Status');
            this.log('→ SMTP: Checking recipient server status...', 'command');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!this.isReceiverOnline) {
                this.updateProgress(85, 'Receiver Offline - Queued');
                const emailId = Date.now() + Math.random();
                config.id = emailId;
                this.log('⏸️ Receiver is OFFLINE. Email stored in server queue.', 'warning');
                this.log(`📧 Email queued [ID: ${emailId}]: From ${config.sender} to ${config.recipient}`, 'info');
                this.queuedEmails.push({
                    ...config,
                    queuedAt: new Date(),
                    resolve: () => {}
                });
                this.updateStats();
                this.log(`📊 Total emails in queue: ${this.queuedEmails.length}`, 'info');
                this.log('⏳ Email will be delivered when receiver comes online...', 'warning');
                
                // Complete the session
                this.currentStep = 5;
                this.updateProgress(100, 'Queued');
                this.highlightNode('clientNode');
                this.log('→ CLIENT: QUIT', 'command');
                
                await this.sendPacket('QUIT', '221', networkDelay, packetLossRate);
                
                this.highlightNode('smtpNode');
                await new Promise(resolve => setTimeout(resolve, serverDelay));
                this.log('← SERVER: 221 Goodbye', 'response');
                
                this.highlightNode(null);
                this.log('=== Email queued successfully! ===', 'success');
                
                // Allow sending more emails quickly
                setTimeout(() => {
                    this.isRunning = false;
                    document.getElementById('sendBtn').disabled = false;
                }, 500);
                return;
            } else {
                this.log('← RECIPIENT SERVER: 200 Server is ONLINE', 'success');
            }

            // Only deliver if receiver is currently online
            if (this.isReceiverOnline) {
                // Forward message to recipient server (now that receiver is online)
                this.updateProgress(90, 'Delivering to Recipient');
                this.log('→ SMTP: Forwarding message to recipient server...', 'command');
                await this.animatePacket('right');
                this.highlightNode('recipientNode');
                await new Promise(resolve => setTimeout(resolve, serverDelay));
                this.log('← RECIPIENT SERVER: 250 Message delivered to mailbox', 'success');
            }

            // STEP 5: QUIT - Close Connection
            this.currentStep = 5;
            this.updateProgress(100, 'Complete');
            this.highlightNode('clientNode');
            this.log('→ CLIENT: QUIT', 'command');
            
            await this.sendPacket('QUIT', '221', networkDelay, packetLossRate);
            
            this.highlightNode('smtpNode');
            await new Promise(resolve => setTimeout(resolve, serverDelay));
            this.log('← SERVER: 221 Goodbye', 'response');
            
            this.highlightNode(null);
            this.log('=== Email delivered successfully! ===', 'success');

        } catch (error) {
            // Handle errors during transmission
            this.log(`❌ ERROR: ${error.message}`, 'error');
            this.updateProgress(this.currentStep * 20, 'Failed');
            this.highlightNode(null);
        } finally {
            // Re-enable send button
            this.isRunning = false;
            document.getElementById('sendBtn').disabled = false;
        }
    }

    /**
     * Toggle receiver online/offline status
     */
    toggleReceiverStatus() {
        this.isReceiverOnline = !this.isReceiverOnline;
        this.updateReceiverStatus();
        
        if (this.isReceiverOnline) {
            this.log('🟢 Receiver status changed to ONLINE', 'success');
            
            // Process any queued emails
            if (this.queuedEmails.length > 0) {
                this.processQueuedEmails();
            }
        } else {
            this.log('🔴 Receiver status changed to OFFLINE', 'warning');
            if (this.queuedEmails.length > 0) {
                this.log(`📋 ${this.queuedEmails.length} email(s) waiting in queue`, 'info');
            }
        }
    }
}

// Initialize Simulator
const simulator = new SMTPSimulator();

// Event Listeners

// Handle Send Email button click
document.getElementById('sendBtn').addEventListener('click', () => {
    // Collect configuration from form inputs
    const config = {
        sender: document.getElementById('senderEmail').value || 'sender@example.com',
        recipient: document.getElementById('recipientEmail').value || 'recipient@example.com',
        subject: document.getElementById('subject').value || 'Test Email',
        body: document.getElementById('messageBody').value || 'This is a test message.',
        attachment: document.getElementById('attachment').value,
        serverDelay: parseFloat(document.getElementById('serverDelay').value) || 1,
        networkDelay: parseInt(document.getElementById('networkDelay').value) || 500,
        packetLoss: parseFloat(document.getElementById('packetLoss').value) || 10
    };

    // Start simulation
    simulator.sendEmail(config);
});

// Handle receiver status toggle
document.getElementById('toggleReceiverBtn').addEventListener('click', () => {
    simulator.toggleReceiverStatus();
});

// Load example data on page load
window.addEventListener('load', () => {
    document.getElementById('senderEmail').value = 'alice@example.com';
    document.getElementById('recipientEmail').value = 'bob@example.com';
    document.getElementById('subject').value = 'Meeting Tomorrow';
    document.getElementById('messageBody').value = 'Hi Bob,\n\nJust wanted to confirm our meeting tomorrow at 2 PM.\n\nBest regards,\nAlice';
    
    // Initialize receiver status display
    simulator.updateReceiverStatus();
    simulator.updateStats();
});

// MODAL FUNCTIONALITY

// Open modal by ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Event listeners for navigation buttons
document.getElementById('learnBtn').addEventListener('click', () => {
    openModal('learnModal');
});

document.getElementById('developedByBtn').addEventListener('click', () => {
    openModal('developedByModal');
});

document.getElementById('helpBtn').addEventListener('click', () => {
    openModal('helpModal');
});

// Close button event listeners
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        closeModal(modal);
    });
});

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal);
        });
    }
});

// DOWNLOAD FUNCTIONALITY

// Generate detailed report for download
function generateReport() {
    const sender = document.getElementById('senderEmail').value || 'Not provided';
    const recipient = document.getElementById('recipientEmail').value || 'Not provided';
    const subject = document.getElementById('subject').value || 'Not provided';
    const body = document.getElementById('messageBody').value || 'Not provided';
    const attachment = document.getElementById('attachment').value || 'None';
    const serverDelay = document.getElementById('serverDelay').value;
    const networkDelay = document.getElementById('networkDelay').value;
    const packetLoss = document.getElementById('packetLoss').value;
    
    const totalPackets = document.getElementById('totalPackets').textContent;
    const lostPackets = document.getElementById('lostPackets').textContent;
    const retransmissions = document.getElementById('retransmissions').textContent;
    const queuedEmails = document.getElementById('queuedEmails').textContent;
    const receiverStatus = simulator.isReceiverOnline ? 'Online' : 'Offline';
    
    const logSection = document.getElementById('logSection');
    const logEntries = Array.from(logSection.querySelectorAll('.log-entry'))
        .map(entry => entry.textContent)
        .join('\n');

    const report = `
╔════════════════════════════════════════════════════════════════╗
║              SMTP PROTOCOL SIMULATOR - REPORT                  ║
╚════════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════════════════════════════
INPUT DETAILS
═══════════════════════════════════════════════════════════════

Email Configuration:
• Sender Email: ${sender}
• Recipient Email: ${recipient}
• Subject: ${subject}
• Message Body: 
${body}
• Attachment: ${attachment}

Network Configuration:
• Server Delay: ${serverDelay} seconds
• Network Delay: ${networkDelay} milliseconds
• Packet Loss Rate: ${packetLoss}%
• Receiver Status: ${receiverStatus}

═══════════════════════════════════════════════════════════════
TRANSMISSION STATISTICS
═══════════════════════════════════════════════════════════════

Network Performance:
• Total Packets Sent: ${totalPackets}
• Packets Lost: ${lostPackets}
• Retransmissions: ${retransmissions}
• Queued Emails: ${queuedEmails}
• Packet Loss Rate: ${packetLoss}%
• Success Rate: ${totalPackets > 0 ? (((totalPackets - lostPackets) / totalPackets) * 100).toFixed(2) : 0}%

Network Configuration Impact:
• Server Delay: ${serverDelay}s (${serverDelay > 2 ? 'Slow' : serverDelay > 1 ? 'Moderate' : 'Fast'} server)
• Network Delay: ${networkDelay}ms (${networkDelay > 1000 ? 'Slow' : networkDelay > 500 ? 'Moderate' : 'Fast'} network)
• Packet Loss: ${packetLoss}% (${packetLoss > 30 ? 'High' : packetLoss > 10 ? 'Moderate' : 'Low'} loss rate)

═══════════════════════════════════════════════════════════════
DETAILED SMTP COMMAND LOG
═══════════════════════════════════════════════════════════════

${logEntries}

═══════════════════════════════════════════════════════════════
INTERPRETATION OF RESULTS
═══════════════════════════════════════════════════════════════

Protocol Sequence:
The SMTP protocol follows a strict command-response sequence:
1. Connection establishment (HELO)
2. Sender identification (MAIL FROM)
3. Recipient validation (RCPT TO)
4. Data transmission (DATA)
5. Receiver availability check (NEW FEATURE)
6. Message queuing if receiver offline (NEW FEATURE)
7. Connection closure (QUIT)

Network Behavior:
${lostPackets > 0 ? 
`This transmission experienced ${lostPackets} packet losses, requiring ${retransmissions} retransmissions.
This demonstrates the reliability mechanisms in network protocols where lost packets
are automatically detected and retransmitted to ensure complete data delivery.` :
`This transmission completed without any packet loss, indicating a stable network
connection. All ${totalPackets} packets were successfully delivered on first attempt.`}

Receiver Status Management:
${receiverStatus === 'Offline' ?
`The receiver was offline during transmission. The email was stored in the server queue
and will be delivered automatically when the receiver comes online. This demonstrates
the store-and-forward mechanism used in email systems.` :
`The receiver was online and the email was delivered immediately to the recipient's
mailbox without any queuing delay.`}

Performance Analysis:
${packetLoss > 30 ? 
`High packet loss rate (${packetLoss}%) significantly impacts transmission efficiency.
In real-world scenarios, this would indicate network congestion or connectivity issues.` :
`The network performed ${packetLoss > 10 ? 'adequately' : 'excellently'} with minimal packet loss.`}

═══════════════════════════════════════════════════════════════
CONCLUSION
═══════════════════════════════════════════════════════════════

Email transmission simulation completed successfully using SMTP protocol.
The visualization demonstrates how email clients communicate with mail servers
through a series of standardized commands and responses. Network conditions
such as delays and packet loss affect transmission efficiency but are handled
through automatic retransmission mechanisms.

The store-and-forward feature ensures that emails are not lost when the receiver
is offline - they are queued on the server and delivered when the receiver
becomes available.

═══════════════════════════════════════════════════════════════
PROJECT INFORMATION
═══════════════════════════════════════════════════════════════

Project: SMTP Protocol Simulator
Purpose: Educational demonstration of email transmission protocol
Technologies: HTML5, CSS, JavaScript
Features: 
• Real-time SMTP command visualization
• Network delay simulation
• Packet loss and retransmission
• Interactive statistics tracking
• Comprehensive logging system
• Receiver status management (Online/Offline)
• Email queuing when receiver offline
• Store-and-forward mechanism
• Multiple email queue support (NEW!)

═══════════════════════════════════════════════════════════════
END OF REPORT
═══════════════════════════════════════════════════════════════
`;

    return report;
}

// Download report as text file
document.getElementById('downloadBtn').addEventListener('click', () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SMTP_Simulation_Report_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show notification
    alert('📥 Report downloaded successfully!\n\nThe detailed SMTP simulation report has been saved to your downloads folder.');
});