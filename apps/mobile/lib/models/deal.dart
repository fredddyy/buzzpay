enum DealType { timeWindow, quantityLimited, anytime, firstTimer, bundle, scheduled }

class Deal {
  final String id;
  final String vendorId;
  final String vendorName;
  final String? vendorLogo;
  final bool vendorIsOpen;
  final String vendorOpensAt;
  final String vendorClosesAt;
  final String title;
  final String description;
  final String category;
  final String? imageUrl;
  final int originalPrice;
  final int studentPrice;
  final int savings;
  final int totalQuantity;
  final int remainingQty;
  final int maxPerUser;
  final DateTime startsAt;
  final DateTime expiresAt;
  final bool isFeatured;
  final String? vendorAddress;

  Deal({
    required this.id,
    required this.vendorId,
    required this.vendorName,
    this.vendorLogo,
    required this.vendorIsOpen,
    required this.vendorOpensAt,
    required this.vendorClosesAt,
    required this.title,
    required this.description,
    required this.category,
    this.imageUrl,
    required this.originalPrice,
    required this.studentPrice,
    required this.savings,
    required this.totalQuantity,
    required this.remainingQty,
    required this.maxPerUser,
    required this.startsAt,
    required this.expiresAt,
    required this.isFeatured,
    this.vendorAddress,
  });

  factory Deal.fromJson(Map<String, dynamic> json) => Deal(
        id: json['id'] as String,
        vendorId: json['vendorId'] as String,
        vendorName: json['vendorName'] as String,
        vendorLogo: json['vendorLogo'] as String?,
        vendorIsOpen: json['vendorIsOpen'] as bool? ?? true,
        vendorOpensAt: json['vendorOpensAt'] as String? ?? '08:00',
        vendorClosesAt: json['vendorClosesAt'] as String? ?? '21:00',
        title: json['title'] as String,
        description: json['description'] as String,
        category: json['category'] as String,
        imageUrl: json['imageUrl'] as String?,
        originalPrice: json['originalPrice'] as int,
        studentPrice: json['studentPrice'] as int,
        savings: json['savings'] as int,
        totalQuantity: json['totalQuantity'] as int,
        remainingQty: json['remainingQty'] as int,
        maxPerUser: json['maxPerUser'] as int,
        startsAt: DateTime.parse(json['startsAt'] as String),
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        isFeatured: json['isFeatured'] as bool? ?? false,
        vendorAddress: json['vendorAddress'] as String?,
      );

  String get formattedOriginalPrice => _formatNaira(originalPrice);
  String get formattedStudentPrice => _formatNaira(studentPrice);
  String get formattedSavings => _formatNaira(savings);

  int get discountPercent =>
      originalPrice > 0 ? ((savings / originalPrice) * 100).round() : 0;

  bool get isLowStock => remainingQty <= 10 && remainingQty > 0;
  bool get isSoldOut => remainingQty <= 0;

  /// Derived deal type for visual signaling
  DealType get dealType {
    final minutesLeft = expiresAt.difference(DateTime.now()).inMinutes;
    // Time-window: expires within 2 hours
    if (minutesLeft > 0 && minutesLeft <= 120) return DealType.timeWindow;
    // Quantity-limited: low stock
    if (isLowStock) return DealType.quantityLimited;
    // Bundle: title has "+" or "Combo"
    if (title.contains('+') || title.toLowerCase().contains('combo')) {
      return DealType.bundle;
    }
    // First-timer: max 1 per user
    if (maxPerUser == 1 && remainingQty > 10) return DealType.firstTimer;
    // Default
    return DealType.anytime;
  }

  bool get isBundle => dealType == DealType.bundle;
  bool get isTimeWindow => dealType == DealType.timeWindow;
  bool get isScheduled => startsAt.isAfter(DateTime.now());

  /// Formatted opens time like "8 AM"
  String get opensAtFormatted {
    final parts = vendorOpensAt.split(':');
    final h = int.parse(parts[0]);
    if (h == 0) return '12 AM';
    if (h < 12) return '$h AM';
    if (h == 12) return '12 PM';
    return '${h - 12} PM';
  }

  String _formatNaira(int kobo) {
    final naira = kobo / 100;
    if (naira == naira.roundToDouble()) {
      return '₦${naira.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
    }
    return '₦${naira.toStringAsFixed(2)}';
  }
}
