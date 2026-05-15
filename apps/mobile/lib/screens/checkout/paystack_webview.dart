import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme/colors.dart';

class PaystackWebView extends StatefulWidget {
  final String authorizationUrl;
  final String reference;

  const PaystackWebView({
    super.key,
    required this.authorizationUrl,
    required this.reference,
  });

  @override
  State<PaystackWebView> createState() => _PaystackWebViewState();
}

class _PaystackWebViewState extends State<PaystackWebView> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _done = false;
  int _pageLoads = 0;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            setState(() => _loading = true);
          },
          onPageFinished: (url) {
            setState(() => _loading = false);
            _pageLoads++;

            // After the initial page, any subsequent page load on Paystack
            // means the payment completed (success/failure redirect)
            if (_pageLoads > 1 && !_done) {
              // Give Paystack a moment to render, then auto-close as success
              Future.delayed(const Duration(seconds: 3), () {
                if (mounted && !_done) {
                  _done = true;
                  Navigator.of(context).pop('success');
                }
              });
            }
          },
          onNavigationRequest: (request) {
            final url = request.url;
            if (_done) return NavigationDecision.prevent;

            // Detect callback URL patterns
            if (url.contains('buzzpay.ng/payment/success') ||
                url.contains('trxref=') ||
                url.contains('reference=') ||
                url.contains('/callback')) {
              _done = true;
              Navigator.of(context).pop('success');
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizationUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.card,
      appBar: AppBar(
        title: const Text('Complete Payment'),
        backgroundColor: AppColors.card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            // If we've loaded more than the initial page, payment likely completed
            Navigator.of(context).pop(_pageLoads > 1 ? 'success' : 'cancelled');
          },
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
        ],
      ),
    );
  }
}
