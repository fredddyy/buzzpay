import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/api_client.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
