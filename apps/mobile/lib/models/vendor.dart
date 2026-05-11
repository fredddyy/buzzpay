import 'deal.dart';

class Vendor {
  final String id;
  final String businessName;
  final String businessAddress;
  final String? logoUrl;
  final String? coverUrl;
  final bool isOpen;
  final String opensAt;
  final String closesAt;
  final double rating;
  final int totalStudents;
  final List<String> buzzTags;
  final List<Deal> deals;
  final bool isFollowed;

  Vendor({
    required this.id,
    required this.businessName,
    required this.businessAddress,
    this.logoUrl,
    this.coverUrl,
    required this.isOpen,
    required this.opensAt,
    required this.closesAt,
    this.rating = 4.5,
    this.totalStudents = 0,
    this.buzzTags = const [],
    this.deals = const [],
    this.isFollowed = false,
  });

  String get opensAtFormatted => _formatTime(opensAt);
  String get closesAtFormatted => _formatTime(closesAt);

  String _formatTime(String hhmm) {
    final h = int.parse(hhmm.split(':')[0]);
    if (h == 0) return '12 AM';
    if (h < 12) return '$h AM';
    if (h == 12) return '12 PM';
    return '${h - 12} PM';
  }

  Vendor copyWith({bool? isFollowed}) => Vendor(
        id: id,
        businessName: businessName,
        businessAddress: businessAddress,
        logoUrl: logoUrl,
        coverUrl: coverUrl,
        isOpen: isOpen,
        opensAt: opensAt,
        closesAt: closesAt,
        rating: rating,
        totalStudents: totalStudents,
        buzzTags: buzzTags,
        deals: deals,
        isFollowed: isFollowed ?? this.isFollowed,
      );
}
