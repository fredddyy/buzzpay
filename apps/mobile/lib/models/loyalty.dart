class LoyaltyCard {
  final String id;
  final String vendorId;
  final String vendorName;
  final int stamps;
  final int target;
  final int rewardsUsed;

  LoyaltyCard({
    required this.id,
    required this.vendorId,
    required this.vendorName,
    required this.stamps,
    required this.target,
    required this.rewardsUsed,
  });

  bool get isComplete => stamps >= target;
  int get remaining => (target - stamps).clamp(0, target);
  double get progress => stamps / target;

  factory LoyaltyCard.fromJson(Map<String, dynamic> json) => LoyaltyCard(
        id: json['id'] as String,
        vendorId: json['vendorId'] as String,
        vendorName: json['vendorName'] as String? ?? '',
        stamps: json['stamps'] as int? ?? 0,
        target: json['target'] as int? ?? 5,
        rewardsUsed: json['rewardsUsed'] as int? ?? 0,
      );
}
