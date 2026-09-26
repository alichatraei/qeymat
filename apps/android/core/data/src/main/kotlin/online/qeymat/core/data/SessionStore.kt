package online.qeymat.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first

private val Context.sessionDataStore: DataStore<Preferences> by preferencesDataStore(name = "session")

/** نشست کاربر: توکن و شماره‌ای که با آن وارد شده است */
data class Session(val token: String, val phone: String)

/**
 * نگه‌دارنده‌ی نشست. هر ورود ۳۰ روز معتبر است و روی دستگاه می‌ماند؛
 * شماره‌ی آخرین ورود حتی بعد از خروج هم برای پرکردن خودکار نگه داشته می‌شود.
 */
class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")
    private val phoneKey = stringPreferencesKey("phone")
    private val lastPhoneKey = stringPreferencesKey("last_phone")
    private val savedAtKey = longPreferencesKey("saved_at")

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session.asStateFlow()

    @Volatile
    private var cachedToken: String? = null

    /** برای interceptor شبکه — بدون تعلیق */
    fun currentToken(): String? = cachedToken

    /** یک‌بار هنگام شروع اپ یا Worker صدا زده می‌شود */
    suspend fun load(): Session? {
        val prefs = context.sessionDataStore.data.first()
        val token = prefs[tokenKey]
        val phone = prefs[phoneKey]
        val savedAt = prefs[savedAtKey] ?: 0L
        val expired = System.currentTimeMillis() - savedAt > SESSION_DAYS * 24 * 60 * 60 * 1000L
        val session = if (token != null && phone != null && !expired) Session(token, phone) else null
        cachedToken = session?.token
        _session.value = session
        return session
    }

    suspend fun lastPhone(): String? = context.sessionDataStore.data.first()[lastPhoneKey]

    suspend fun save(token: String, phone: String) {
        context.sessionDataStore.edit {
            it[tokenKey] = token
            it[phoneKey] = phone
            it[lastPhoneKey] = phone
            it[savedAtKey] = System.currentTimeMillis()
        }
        cachedToken = token
        _session.value = Session(token, phone)
    }

    suspend fun clear() {
        context.sessionDataStore.edit {
            it.remove(tokenKey)
            it.remove(phoneKey)
            it.remove(savedAtKey)
        }
        cachedToken = null
        _session.value = null
    }

    companion object {
        const val SESSION_DAYS = 30
    }
}
