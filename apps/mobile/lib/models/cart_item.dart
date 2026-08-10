class CartItem {
  final String dealId;
  final String vendorId;
  final String vendorName;
  final String dealTitle;
  final String? imageUrl;
  final int studentPrice; // kobo
  final int originalPrice; // kobo
  final int maxPerUser;
  int quantity;

  CartItem({
    required this.dealId,
    required this.vendorId,
    required this.vendorName,
    required this.dealTitle,
    this.imageUrl,
    required this.studentPrice,
    required this.originalPrice,
    required this.maxPerUser,
    this.quantity = 1,
  });

  int get subtotal => studentPrice * quantity;
  int get savings => (originalPrice - studentPrice) * quantity;

  String get formattedSubtotal => formatNaira(subtotal);
  String get formattedUnitPrice => formatNaira(studentPrice);
  String get formattedOriginalPrice => formatNaira(originalPrice);

  static String formatNaira(int kobo) {
    final naira = kobo ~/ 100;
    if (naira >= 1000) {
      return '₦${naira.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}';
    }
    return '₦$naira';
  }

  Map<String, dynamic> toJson() => {
    'dealId': dealId,
    'vendorId': vendorId,
    'vendorName': vendorName,
    'dealTitle': dealTitle,
    'imageUrl': imageUrl,
    'studentPrice': studentPrice,
    'originalPrice': originalPrice,
    'maxPerUser': maxPerUser,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    dealId: json['dealId'] as String,
    vendorId: json['vendorId'] as String,
    vendorName: json['vendorName'] as String,
    dealTitle: json['dealTitle'] as String,
    imageUrl: json['imageUrl'] as String?,
    studentPrice: json['studentPrice'] as int,
    originalPrice: json['originalPrice'] as int,
    maxPerUser: json['maxPerUser'] as int? ?? 1,
    quantity: json['quantity'] as int? ?? 1,
  );
}
