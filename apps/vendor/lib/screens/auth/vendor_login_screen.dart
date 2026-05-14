import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../core/api_client.dart';

class VendorLoginScreen extends StatefulWidget {
  const VendorLoginScreen({super.key});

  @override
  State<VendorLoginScreen> createState() => _VendorLoginScreenState();
}

class _VendorLoginScreenState extends State<VendorLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Enter email and password');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final api = VendorApiClient();
      await api.login(email, password);
      if (mounted) context.go('/scanner');
    } catch (e) {
      if (mounted) {
        String msg = 'Invalid email or password';
        if (e.toString().contains('Vendor access only')) {
          msg = 'Vendor access only';
        } else if (e.toString().contains('SocketException') || e.toString().contains('connection')) {
          msg = 'Cannot reach server. Check your connection.';
        }
        setState(() { _loading = false; _error = msg; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const Spacer(flex: 2),
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: VColors.primary, borderRadius: BorderRadius.circular(16)),
                child: const Center(child: Text('B', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white))),
              ),
              const SizedBox(height: 16),
              const Text('BuzzPay Vendor', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: VColors.text)),
              const SizedBox(height: 4),
              const Text('Accept student vouchers instantly', style: TextStyle(fontSize: 13, color: VColors.textMuted)),
              const Spacer(flex: 1),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: VColors.text),
                decoration: _inputDecor('Vendor email', Icons.email_outlined),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: VColors.text),
                decoration: _inputDecor('Password', Icons.lock_outlined),
                onSubmitted: (_) => _login(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: VColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: VColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(fontSize: 13, color: VColors.error)),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
              const Spacer(flex: 2),
              const Text('BuzzPay Vendor v1.0.0', style: TextStyle(fontSize: 10, color: VColors.textMuted)),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecor(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: VColors.textMuted),
      prefixIcon: Icon(icon, size: 20, color: VColors.textMuted),
      filled: true,
      fillColor: VColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: VColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: VColors.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: VColors.primary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
