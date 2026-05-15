import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme/colors.dart';
import '../../core/api_client.dart';
import '../../core/scan_queue.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  final _api = VendorApiClient();
  bool _torchOn = false;
  bool _processing = false;
  _ScanResult? _result;
  int _pendingScans = 0;

  @override
  void initState() {
    super.initState();
    ScanQueue.startBackgroundSync();
    _updatePendingCount();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _updatePendingCount() async {
    final count = await ScanQueue.pendingCount();
    if (mounted) setState(() => _pendingScans = count);
  }

  void _onDetect(BarcodeCapture capture) {
    if (_processing || _result != null) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _processing = true);
    HapticFeedback.mediumImpact();
    _redeemQr(code);
  }

  Future<void> _redeemQr(String qrPayload) async {
    // ── OPTIMISTIC: show success instantly ──
    setState(() {
      _processing = false;
      _result = _ScanResult(
        success: true,
        title: 'Verifying...',
        message: 'Processing redemption',
        isPending: true,
      );
    });

    try {
      Map<String, dynamic> data;
      if (qrPayload.startsWith('bp://')) {
        // Rotating QR format
        data = await _api.redeemRotatingQr(qrPayload);
      } else {
        // Static QR (UUID) or manual code — try legacy redeem
        data = await _api.redeemByStaticQr(qrPayload);
      }
      if (!mounted) return;
      setState(() {
        _result = _ScanResult(
          success: true,
          title: data['dealTitle'] ?? 'Voucher Redeemed',
          studentName: data['studentName'],
          message: 'Voucher redeemed successfully',
        );
      });
    } catch (e) {
      if (!mounted) return;
      final errStr = e.toString();

      // Network error → queue for later
      if (_isNetworkError(errStr)) {
        await ScanQueue.enqueue(qrPayload);
        await _updatePendingCount();
        setState(() {
          _result = _ScanResult(
            success: true,
            title: 'Queued for Sync',
            message: 'No network — will sync automatically when connected',
            isQueued: true,
          );
        });
        return;
      }

      // Business error → show failure
      setState(() {
        _result = _ScanResult(
          success: false,
          title: 'Redemption Failed',
          message: _parseError(errStr),
        );
      });
    }
  }

  bool _isNetworkError(String err) {
    return err.contains('SocketException') ||
        err.contains('connection') ||
        err.contains('timeout') ||
        err.contains('HandshakeException') ||
        err.contains('Failed host lookup');
  }

  String _parseError(String errStr) {
    if (errStr.contains('already redeemed')) return 'This voucher has already been redeemed';
    if (errStr.contains('expired')) return 'This voucher has expired';
    if (errStr.contains('not for your business')) return 'This voucher is for a different vendor';
    if (errStr.contains('QR code expired')) return 'QR code expired — ask student to refresh';
    if (errStr.contains('Invalid QR')) return 'Invalid QR code format';
    return 'Failed to redeem voucher';
  }

  void _reset() {
    setState(() => _result = null);
  }

  Future<void> _syncNow() async {
    final result = await ScanQueue.syncAll();
    await _updatePendingCount();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Synced ${result.synced} scan${result.synced != 1 ? 's' : ''}'
          '${result.remaining > 0 ? ', ${result.remaining} still pending' : ''}'),
      backgroundColor: result.remaining > 0 ? VColors.warning : VColors.success,
      duration: const Duration(seconds: 2),
    ));
  }

  void _showManualEntry() {
    final tc = TextEditingController();
    showModalBottomSheet(
      context: context,
      backgroundColor: VColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Manual Entry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: VColors.text)),
            const SizedBox(height: 4),
            const Text('Type the student\'s voucher code', style: TextStyle(fontSize: 12, color: VColors.textMuted)),
            const SizedBox(height: 16),
            TextField(
              controller: tc,
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: 3, color: VColors.text),
              decoration: InputDecoration(
                hintText: 'BZ7742XP',
                hintStyle: TextStyle(color: VColors.textMuted.withValues(alpha: 0.4)),
                filled: true,
                fillColor: VColors.surfaceLight,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: VColors.primary, width: 1.5)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  if (tc.text.isNotEmpty) {
                    setState(() => _processing = true);
                    _redeemQr(tc.text.trim());
                  }
                },
                child: const Text('Verify Code', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: Stack(
        children: [
          // Camera
          MobileScanner(controller: _controller, onDetect: _onDetect),

          // Overlay
          Container(color: Colors.black.withValues(alpha: 0.5)),

          // Scan window
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: VColors.primary.withValues(alpha: 0.6), width: 3),
              ),
            ),
          ),

          // Clear the scan area
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: SizedBox(
                width: 260,
                height: 260,
                child: MobileScanner(controller: _controller, onDetect: _onDetect),
              ),
            ),
          ),

          // Top bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 20,
            right: 20,
            child: Row(
              children: [
                const Text('BuzzScanner', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                const Spacer(),
                // Pending sync badge
                if (_pendingScans > 0)
                  GestureDetector(
                    onTap: _syncNow,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      margin: const EdgeInsets.only(right: 10),
                      decoration: BoxDecoration(
                        color: VColors.warning,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.sync, size: 14, color: Colors.black),
                          const SizedBox(width: 4),
                          Text('$_pendingScans pending',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black)),
                        ],
                      ),
                    ),
                  ),
                // Torch
                GestureDetector(
                  onTap: () {
                    _controller.toggleTorch();
                    setState(() => _torchOn = !_torchOn);
                  },
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _torchOn ? VColors.warning : Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _torchOn ? Icons.flash_on : Icons.flash_off,
                      color: _torchOn ? Colors.black : Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom — manual entry + status
          Positioned(
            bottom: 100,
            left: 20,
            right: 20,
            child: Column(
              children: [
                if (_processing)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    decoration: BoxDecoration(
                      color: VColors.surface,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: VColors.primary)),
                        SizedBox(width: 12),
                        Text('Verifying...', style: TextStyle(color: VColors.text, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  )
                else if (_result != null)
                  _buildResult(_result!)
                else
                  const Text('Point camera at student\'s QR code',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: _showManualEntry,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.keyboard, size: 18, color: Colors.white70),
                        SizedBox(width: 8),
                        Text('Type Code', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResult(_ScanResult r) {
    final Color borderColor;
    final Color iconColor;
    final IconData icon;

    if (r.isQueued) {
      borderColor = VColors.warning.withValues(alpha: 0.3);
      iconColor = VColors.warning;
      icon = Icons.cloud_upload;
    } else if (r.isPending) {
      borderColor = VColors.primary.withValues(alpha: 0.3);
      iconColor = VColors.primary;
      icon = Icons.hourglass_top;
    } else if (r.success) {
      borderColor = VColors.success.withValues(alpha: 0.3);
      iconColor = VColors.success;
      icon = Icons.check_circle;
    } else {
      borderColor = VColors.error.withValues(alpha: 0.3);
      iconColor = VColors.error;
      icon = Icons.error;
    }

    return GestureDetector(
      onTap: _reset,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: VColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          children: [
            Icon(icon, size: 48, color: iconColor),
            const SizedBox(height: 12),
            Text(r.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: VColors.text)),
            if (r.studentName != null)
              Text(r.studentName!, style: const TextStyle(fontSize: 13, color: VColors.textSecondary)),
            const SizedBox(height: 4),
            Text(r.message, style: TextStyle(fontSize: 12, color: iconColor)),
            const SizedBox(height: 12),
            const Text('Tap to scan next', style: TextStyle(fontSize: 11, color: VColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _ScanResult {
  final bool success;
  final String title;
  final String? studentName;
  final String message;
  final bool isPending;
  final bool isQueued;
  _ScanResult({
    required this.success,
    required this.title,
    this.studentName,
    required this.message,
    this.isPending = false,
    this.isQueued = false,
  });
}
