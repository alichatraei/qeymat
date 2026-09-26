package online.qeymat.core.network

import online.qeymat.core.model.AlertsResponse
import online.qeymat.core.model.AnalysisResponse
import online.qeymat.core.model.CreateAlertRequest
import online.qeymat.core.model.CreateAlertResponse
import online.qeymat.core.model.HistoryResponse
import online.qeymat.core.model.MarketSnapshot
import online.qeymat.core.model.MeResponse
import online.qeymat.core.model.OkResponse
import online.qeymat.core.model.OtpSendRequest
import online.qeymat.core.model.OtpSendResponse
import online.qeymat.core.model.OtpVerifyRequest
import online.qeymat.core.model.OtpVerifyResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * API سایت qeymat.online — همان مسیرهایی که وب‌اپ استفاده می‌کند.
 * نشست با هدر Authorization: Bearer فرستاده می‌شود (نه کوکی).
 */
interface QeymatApi {
    @GET("api/public/rates")
    suspend fun rates(): MarketSnapshot

    @GET("api/public/history")
    suspend fun history(
        @Query("symbol") symbol: String,
        @Query("range") range: String,
        @Query("interval") interval: String? = null,
    ): HistoryResponse

    @POST("api/auth/otp/send")
    suspend fun sendOtp(@Body body: OtpSendRequest): OtpSendResponse

    @POST("api/auth/otp/verify")
    suspend fun verifyOtp(@Body body: OtpVerifyRequest): OtpVerifyResponse

    @GET("api/me")
    suspend fun me(): MeResponse

    @GET("api/alerts")
    suspend fun alerts(): AlertsResponse

    @POST("api/alerts")
    suspend fun createAlert(@Body body: CreateAlertRequest): CreateAlertResponse

    @DELETE("api/alerts")
    suspend fun deleteAlert(@Query("id") id: String): OkResponse

    @GET("api/plus/analysis")
    suspend fun analysis(@Query("symbol") symbol: String): AnalysisResponse
}
