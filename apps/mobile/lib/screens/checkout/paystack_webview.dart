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

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (url) {
            setState(() => _loading = false);
            _checkUrl(url);
          },
          onNavigationRequest: (request) {
            if (_checkUrl(request.url)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.authorizationUrl));
  }

  bool _checkUrl(String url) {
    if (_done) return false;

    // Detect Paystack callback — payment done
    if (url.contains('callback') ||
        url.contains('trxref=') ||
        url.contains('reference=') ||
        url.contains('paystack.co/charge/success') ||
        url.contains('paystack.co/close')) {
      _done = true;
      Navigator.of(context).pop('success');
      return true;
    }
    // Detect cancel
    if (url.contains('cancel') || url.contains('/close')) {
      _done = true;
      Navigator.of(context).pop('cancelled');
      return true;
    }
    return false;
  }

  // Also try injecting JS to detect success state on Paystack page
  void _checkForSuccessViaJs() {
    _controller.runJavaScriptReturningResult(
      '''(function() {
        var text = document.body ? document.body.innerText : "";
        return text.indexOf("Payment Successful") >= 0 ||
               text.indexOf("Transaction Successful") >= 0 ||
               text.indexOf("Your payment was successful") >= 0 ||
               text.indexOf("You paid") >= 0 ||
               document.querySelector(".success-page") != null ||
               document.querySelector("[class*=success]") != null;
      })()'''
    ).then((result) {
      if ((result.toString() == 'true' || result == true) && !_done) {
        _done = true;
        if (mounted) Navigator.of(context).pop('success');
      }
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    // Periodically check for success via JS (fallback)
    if (!_loading && !_done) {
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted && !_done) _checkForSuccessViaJs();
      });
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && !_done) _checkForSuccessViaJs();
      });
      Future.delayed(const Duration(seconds: 6), () {
        if (mounted && !_done) _checkForSuccessViaJs();
      });
    }

    return Scaffold(
      backgroundColor: AppColors.card,
      appBar: AppBar(
        title: const Text('Complete Payment'),
        backgroundColor: AppColors.card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(_done ? 'success' : 'cancelled'),
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
