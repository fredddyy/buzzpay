import 'dart:ui';
import 'package:flutter/material.dart';

class ShimmerProgressBar extends StatefulWidget {
  final double value;
  final Color color;
  final double height;
  final BorderRadius? borderRadius;

  const ShimmerProgressBar({
    super.key,
    required this.value,
    required this.color,
    this.height = 5,
    this.borderRadius,
  });

  @override
  State<ShimmerProgressBar> createState() => _ShimmerProgressBarState();
}

class _ShimmerProgressBarState extends State<ShimmerProgressBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.zero,
      child: SizedBox(
        height: widget.height,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return CustomPaint(
              size: Size(double.infinity, widget.height),
              painter: _ShimmerBarPainter(
                value: widget.value,
                color: widget.color,
                shimmerPosition: _controller.value,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ShimmerBarPainter extends CustomPainter {
  final double value;
  final Color color;
  final double shimmerPosition;

  _ShimmerBarPainter({required this.value, required this.color, required this.shimmerPosition});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = color.withValues(alpha: 0.15);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final fillWidth = size.width * value;
    final fillPaint = Paint()..color = color;
    canvas.drawRect(Rect.fromLTWH(0, 0, fillWidth, size.height), fillPaint);

    final shimmerWidth = fillWidth * 0.4;
    final shimmerX = fillWidth * shimmerPosition;
    final shimmerPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          color.withValues(alpha: 0.0),
          Colors.white.withValues(alpha: 0.6),
          color.withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(shimmerX - shimmerWidth / 2, 0, shimmerWidth, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, fillWidth, size.height), shimmerPaint);
  }

  @override
  bool shouldRepaint(covariant _ShimmerBarPainter oldDelegate) =>
      shimmerPosition != oldDelegate.shimmerPosition || value != oldDelegate.value;
}
