package online.qeymat.core.model

import kotlinx.serialization.Serializable

@Serializable
data class OtpSendRequest(val phone: String)

@Serializable
data class OtpSendResponse(
    val ok: Boolean = false,
    val phone: String? = null,
    val expiresInSec: Int? = null,
)

@Serializable
data class OtpVerifyRequest(val phone: String, val code: String)

@Serializable
data class OtpVerifyResponse(
    val ok: Boolean = false,
    val isNew: Boolean = false,
    val role: String? = null,
    val token: String? = null,
    val phone: String? = null,
)

/** وضعیت قیمت پلاس: پلاس تا ۱۰ و پلاس حرفه‌ای تا ۵۰ شاخص هشدار پیامکی */
@Serializable
data class PlusStatus(
    val active: Boolean = false,
    val plan: String? = null,
    val tier: String? = null,
    val smsLimit: Int = 0,
    val expiresAt: String? = null,
)

@Serializable
data class MeUser(
    val id: String,
    val name: String = "",
    val phone: String? = null,
    val role: String = "USER",
)

@Serializable
data class MeResponse(val user: MeUser, val plus: PlusStatus = PlusStatus())

@Serializable
data class ApiError(val code: String = "", val message: String = "")

@Serializable
data class ErrorEnvelope(val error: ApiError? = null, val retryAfterSec: Int? = null)

@Serializable
data class OkResponse(val ok: Boolean = false)
