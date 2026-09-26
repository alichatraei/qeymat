package online.qeymat.core.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import online.qeymat.core.model.AlertsResponse
import online.qeymat.core.model.CreateAlertRequest
import online.qeymat.core.model.OtpSendRequest
import online.qeymat.core.model.OtpVerifyRequest
import online.qeymat.core.model.PlusStatus
import online.qeymat.core.network.ApiException
import online.qeymat.core.network.QeymatApi
import online.qeymat.core.network.apiCall

/** ورود با شماره موبایل، وضعیت قیمت پلاس و هشدارهای قیمت */
class AccountRepository(
    private val api: QeymatApi,
    private val sessionStore: SessionStore,
) {
    val session: StateFlow<Session?> = sessionStore.session

    private val _plus = MutableStateFlow(PlusStatus())
    val plus: StateFlow<PlusStatus> = _plus.asStateFlow()

    suspend fun lastPhone(): String? = sessionStore.lastPhone()

    /** @return شماره‌ی پوشانده‌شده برای نمایش («۰۹۱۲***۴۵۶۷») */
    suspend fun sendCode(phone: String): Result<String> {
        val normalized = Phone.normalize(phone) ?: return Result.failure(ApiException("شماره موبایل معتبر نیست."))
        return apiCall { api.sendOtp(OtpSendRequest(normalized)) }.map { it.phone ?: normalized }
    }

    suspend fun verify(phone: String, code: String): Result<Unit> {
        val normalized = Phone.normalize(phone) ?: return Result.failure(ApiException("شماره موبایل معتبر نیست."))
        val clean = code.filter { it.isDigit() }.map { if (it in '۰'..'۹') '0' + (it - '۰') else it }.joinToString("")
        return apiCall { api.verifyOtp(OtpVerifyRequest(normalized, clean)) }.mapCatching { response ->
            val token = response.token ?: throw ApiException("پاسخ ورود ناقص است. اپ را به‌روز کنید.")
            sessionStore.save(token, response.phone ?: normalized)
            refreshAccount()
            Unit
        }
    }

    suspend fun logout() {
        sessionStore.clear()
        _plus.value = PlusStatus()
    }

    /** وضعیت پلاس را از سرور می‌خواند؛ نشست منقضی‌شده پاک می‌شود */
    suspend fun refreshAccount(): Result<PlusStatus> {
        if (sessionStore.currentToken() == null) return Result.success(PlusStatus())
        return apiCall { api.me() }
            .onSuccess { _plus.value = it.plus }
            .onFailure { if ((it as? ApiException)?.status == 401) logout() }
            .map { it.plus }
    }

    suspend fun alerts(): Result<AlertsResponse> =
        apiCall { api.alerts() }
            .onSuccess { _plus.value = it.plus }
            .onFailure { if ((it as? ApiException)?.status == 401) logout() }

    suspend fun createAlert(symbol: String, threshold: Double, sms: Boolean): Result<Unit> =
        apiCall { api.createAlert(CreateAlertRequest(symbol = symbol, threshold = threshold, sms = sms)) }.map { }

    suspend fun deleteAlert(id: String): Result<Unit> = apiCall { api.deleteAlert(id) }.map { }
}

object Phone {
    /** 09xxxxxxxxx از ورودی‌هایی مثل +98، 0098، ارقام فارسی و فاصله */
    fun normalize(input: String): String? {
        var value = input
            .map { char ->
                when (char) {
                    in '۰'..'۹' -> '0' + (char - '۰')
                    in '٠'..'٩' -> '0' + (char - '٠')
                    else -> char
                }
            }
            .filter { it.isDigit() || it == '+' }
            .joinToString("")
        value = when {
            value.startsWith("+98") -> "0" + value.drop(3)
            value.startsWith("0098") -> "0" + value.drop(4)
            value.startsWith("98") && value.length == 12 -> "0" + value.drop(2)
            value.startsWith("9") && value.length == 10 -> "0$value"
            else -> value
        }
        return value.takeIf { Regex("^09\\d{9}$").matches(it) }
    }
}
