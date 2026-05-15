import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class VendorApiClient {
  // For emulator: 10.0.2.2 | For physical device: use your machine IP
  static const _baseUrl = 'http://10.0.2.2:3000/api';
  static const _keyAccess = 'vendor_access_token';
  static const _keyRefresh = 'vendor_refresh_token';

  final Dio _dio;

  VendorApiClient()
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(_keyAccess);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshed = await _tryRefresh();
          if (refreshed) {
            final prefs = await SharedPreferences.getInstance();
            final token = prefs.getString(_keyAccess);
            error.requestOptions.headers['Authorization'] = 'Bearer $token';
            final response = await _dio.fetch(error.requestOptions);
            handler.resolve(response);
            return;
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _tryRefresh() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString(_keyRefresh);
      if (refreshToken == null) return false;

      final response = await Dio(BaseOptions(baseUrl: _baseUrl)).post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        await saveTokens(data['accessToken'], data['refreshToken']);
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Login with email/password, validates VENDOR role
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];
    final user = data['user'];
    final tokens = data['tokens'];

    if (user['role'] != 'VENDOR') {
      throw Exception('Vendor access only');
    }

    await saveTokens(tokens['accessToken'], tokens['refreshToken']);
    return user;
  }

  /// Redeem a rotating QR code scanned from a student
  Future<Map<String, dynamic>> redeemRotatingQr(String qrPayload) async {
    final response = await _dio.post('/vouchers/redeem-rotating', data: {
      'qrPayload': qrPayload,
    });
    return response.data['data'];
  }

  /// Redeem by static QR data (UUID) or manual code
  Future<Map<String, dynamic>> redeemByStaticQr(String qrData) async {
    final response = await _dio.post('/vouchers/redeem', data: {
      'qrData': qrData,
    });
    return response.data['data'];
  }

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccess, accessToken);
    await prefs.setString(_keyRefresh, refreshToken);
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccess);
    await prefs.remove(_keyRefresh);
  }

  Future<bool> hasTokens() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccess) != null;
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) =>
      _dio.get(path, queryParameters: queryParams);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);
}
