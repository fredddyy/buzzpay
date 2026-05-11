class User {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? verificationStatus;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.verificationStatus,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String,
        role: json['role'] as String,
        verificationStatus: json['verificationStatus'] as String?,
      );

  bool get isVerified => verificationStatus == 'APPROVED';
  bool get isPending => verificationStatus == 'PENDING';
}

class AuthTokens {
  final String accessToken;
  final String refreshToken;

  AuthTokens({required this.accessToken, required this.refreshToken});

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
      );
}

class LoginResponse {
  final User user;
  final AuthTokens tokens;

  LoginResponse({required this.user, required this.tokens});

  factory LoginResponse.fromJson(Map<String, dynamic> json) => LoginResponse(
        user: User.fromJson(json['user'] as Map<String, dynamic>),
        tokens: AuthTokens.fromJson(json['tokens'] as Map<String, dynamic>),
      );
}
