class Voucher {
  final String id;
  final String code;
  final String qrData;
  final String status;
  final DateTime expiresAt;
  final DateTime? redeemedAt;
  final DateTime createdAt;
  final VoucherDeal deal;

  Voucher({
    required this.id,
    required this.code,
    required this.qrData,
    required this.status,
    required this.expiresAt,
    this.redeemedAt,
    required this.createdAt,
    required this.deal,
  });

  factory Voucher.fromJson(Map<String, dynamic> json) => Voucher(
        id: json['id'] as String,
        code: json['code'] as String,
        qrData: json['qrData'] as String,
        status: json['status'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        redeemedAt: json['redeemedAt'] != null
            ? DateTime.parse(json['redeemedAt'] as String)
            : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
        deal: VoucherDeal.fromJson(json['deal'] as Map<String, dynamic>),
      );

  bool get isActive => status == 'ACTIVE' && expiresAt.isAfter(DateTime.now());
  bool get isRedeemed => status == 'REDEEMED';
  bool get isExpired =>
      status == 'EXPIRED' || expiresAt.isBefore(DateTime.now());

  Duration get timeRemaining => expiresAt.difference(DateTime.now());
}

class VoucherDeal {
  final String title;
  final String? imageUrl;
  final String vendorName;
  final int studentPrice;

  VoucherDeal({
    required this.title,
    this.imageUrl,
    required this.vendorName,
    required this.studentPrice,
  });

  factory VoucherDeal.fromJson(Map<String, dynamic> json) => VoucherDeal(
        title: json['title'] as String,
        imageUrl: json['imageUrl'] as String?,
        vendorName: json['vendorName'] as String,
        studentPrice: json['studentPrice'] as int,
      );

  String get formattedPrice {
    final naira = studentPrice / 100;
    return '₦${naira.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}
