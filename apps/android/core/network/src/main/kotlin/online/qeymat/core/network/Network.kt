package online.qeymat.core.network

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import online.qeymat.core.model.ErrorEnvelope
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/** تنظیمات JSON مشترک: فیلدهای ناشناخته و مقدار نامعتبر enum سرور اپ را نمی‌شکند */
val QeymatJson: Json = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
    isLenient = true
}

object Network {
    const val BASE_URL = "https://qeymat.online/"

    /**
     * @param tokenProvider توکن نشست فعلی؛ هر درخواست تازه می‌خواند
     * @param clientTag مثل «android/2.0.0» — سرور با آن توکن را در پاسخ ورود برمی‌گرداند
     */
    fun create(
        tokenProvider: () -> String?,
        clientTag: String,
        debug: Boolean = false,
        baseUrl: String = BASE_URL,
    ): QeymatApi {
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .callTimeout(40, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor { chain ->
                val builder = chain.request().newBuilder()
                    .header("x-qeymat-client", clientTag)
                    .header("Accept", "application/json")
                    .header("Accept-Language", "fa-IR,fa;q=0.9")
                tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }
                chain.proceed(builder.build())
            }
            .apply {
                if (debug) {
                    addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
                }
            }
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(QeymatJson.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(QeymatApi::class.java)
    }
}

/** خطای قابل نمایش به کاربر، همراه با کد سرور (مثل plus_required یا sms_limit) */
class ApiException(message: String, val code: String? = null, val status: Int? = null) : Exception(message)

/**
 * هر خطای شبکه را به ApiException با پیام فارسی تبدیل می‌کند.
 * پیام سرور ({ error: { message } }) اگر باشد، همان نمایش داده می‌شود.
 */
fun Throwable.toApiException(): ApiException = when (this) {
    is ApiException -> this
    is HttpException -> {
        val body = runCatching { response()?.errorBody()?.string() }.getOrNull()
        val envelope = body?.let { runCatching { QeymatJson.decodeFromString(ErrorEnvelope.serializer(), it) }.getOrNull() }
        ApiException(
            message = envelope?.error?.message?.takeIf { it.isNotBlank() } ?: "خطای سرور (${code()})",
            code = envelope?.error?.code,
            status = code(),
        )
    }
    is IOException -> ApiException("اتصال به اینترنت برقرار نیست.")
    else -> ApiException(message ?: "خطای ناشناخته")
}

/** اجرای امن یک درخواست */
suspend fun <T> apiCall(block: suspend () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (cancel: kotlinx.coroutines.CancellationException) {
        throw cancel
    } catch (error: Throwable) {
        Result.failure(error.toApiException())
    }
