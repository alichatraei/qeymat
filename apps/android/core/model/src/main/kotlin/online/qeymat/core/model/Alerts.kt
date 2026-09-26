package online.qeymat.core.model

import kotlinx.serialization.Serializable

@Serializable
data class PriceAlert(
    val id: String,
    val symbol: String,
    val nameFa: String,
    val unit: String = "TOMAN",
    val current: Double? = null,
    /** ABOVE | BELOW */
    val direction: String = "ABOVE",
    val threshold: Double,
    val push: Boolean = true,
    val sms: Boolean = false,
    val isActive: Boolean = true,
    val firedAt: String? = null,
    val createdAt: String = "",
)

@Serializable
data class AlertsResponse(
    val plus: PlusStatus = PlusStatus(),
    val smsUsed: Int = 0,
    val alerts: List<PriceAlert> = emptyList(),
)

@Serializable
data class CreateAlertRequest(
    val symbol: String,
    val threshold: Double,
    val direction: String? = null,
    val sms: Boolean = false,
)

@Serializable
data class CreateAlertResponse(val ok: Boolean = false, val id: String? = null, val direction: String? = null)
