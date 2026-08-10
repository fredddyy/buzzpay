import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/mock_data.dart';
import '../core/services/api_client.dart';
import '../core/services/push_service.dart';
import '../models/user.dart';
import 'api_provider.dart';

enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({AuthStatus? status, User? user, String? error}) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        error: error,
      );
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    if (useMockData) {
      return AuthState(
        status: AuthStatus.authenticated,
        user: User(
          id: 'mock_user',
          email: 'student@unilag.edu.ng',
          fullName: 'Tunde Bakare',
          role: 'STUDENT',
          verificationStatus: 'APPROVED',
        ),
      );
    }
    // Start unauthenticated — user authenticates via phone/login flow
    return const AuthState(status: AuthStatus.unauthenticated);
  }

  ApiClient get _api => ref.read(apiClientProvider);

  Future<void> _checkAuth() async {
    if (useMockData) {
      state = AuthState(
        status: AuthStatus.authenticated,
        user: User(
          id: 'mock_user',
          email: 'student@unilag.edu.ng',
          fullName: 'Tunde Bakare',
          role: 'STUDENT',
          verificationStatus: 'APPROVED',
        ),
      );
      return;
    }
    final hasTokens = await _api.hasTokens();
    if (hasTokens) {
      await fetchProfile();
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> fetchProfile() async {
    try {
      final response = await _api.get('/auth/me');
      final userData = response.data['data'];
      state = AuthState(
        status: AuthStatus.authenticated,
        user: User.fromJson(userData),
      );
      _registerFcmToken();
    } catch (_) {
      // Token might be expired, but don't log out — refresh will handle it
      state = state.copyWith(status: AuthStatus.authenticated);
    }
  }

  Future<void> _registerFcmToken() async {
    final fcmToken = PushService().token;
    if (fcmToken == null) return;
    try {
      await _api.post('/users/fcm-token', data: {'token': fcmToken});
      debugPrint('[FCM] Token registered with API');
    } catch (_) {}
  }

  Future<void> signup({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String university,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      state = AuthState(
        status: AuthStatus.authenticated,
        user: User(
          id: 'mock_user',
          email: email,
          fullName: fullName,
          role: 'STUDENT',
          verificationStatus: 'PENDING',
        ),
      );
      return;
    }

    try {
      final response = await _api.post('/auth/signup', data: {
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'university': university,
      });
      final loginResponse = LoginResponse.fromJson(response.data['data']);
      await _api.saveTokens(
        loginResponse.tokens.accessToken,
        loginResponse.tokens.refreshToken,
      );
      state = AuthState(
        status: AuthStatus.authenticated,
        user: loginResponse.user,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: _extractError(e),
      );
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final response = await _api.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final loginResponse = LoginResponse.fromJson(response.data['data']);
      await _api.saveTokens(
        loginResponse.tokens.accessToken,
        loginResponse.tokens.refreshToken,
      );
      state = AuthState(
        status: AuthStatus.authenticated,
        user: loginResponse.user,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: _extractError(e),
      );
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Set authenticated after signup + verification flow (no API call needed)
  void setAuthenticated({required String name, String? email, String? id}) {
    state = AuthState(
      status: AuthStatus.authenticated,
      user: User(
        id: id ?? state.user?.id ?? 'pending',
        email: email ?? state.user?.email ?? '',
        fullName: name,
        role: 'STUDENT',
        verificationStatus: state.user?.verificationStatus ?? 'PENDING',
      ),
    );
  }

  void updateVerificationStatus(String status) {
    if (state.user == null) return;
    state = AuthState(
      status: AuthStatus.authenticated,
      user: User(
        id: state.user!.id,
        email: state.user!.email,
        fullName: state.user!.fullName,
        role: state.user!.role,
        verificationStatus: status,
      ),
    );
  }

  String _extractError(dynamic e) {
    if (e is Exception) {
      try {
        final dynamic dioError = e;
        return (dioError as dynamic).response?.data?['message']?.toString() ??
            'Something went wrong';
      } catch (_) {}
    }
    return 'Something went wrong';
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
