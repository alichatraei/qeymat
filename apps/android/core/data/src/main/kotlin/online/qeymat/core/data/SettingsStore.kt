package online.qeymat.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import online.qeymat.core.model.Category

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

enum class ViewMode { LIST, GRID }

/** پوسته‌ی رنگی: پیرو گوشی، روشن یا تاریک */
enum class ThemeMode { SYSTEM, LIGHT, DARK }

/**
 * تنظیمات کاربر روی دستگاه.
 *
 * - favorites: ارزهای منتخب صفحه‌ی اول، به ترتیب دلخواه کاربر
 * - stars: دارایی‌های ستاره‌دار سایر دسته‌ها
 * - orders: ترتیب دلخواه هر دسته (با نگه‌داشتن و کشیدن)
 */
data class UserSettings(
    val favorites: List<String> = DEFAULT_FAVORITES,
    val stars: Set<String> = emptySet(),
    val orders: Map<Category, List<String>> = emptyMap(),
    val viewMode: ViewMode = ViewMode.LIST,
    val showBuy: Boolean = true,
    val notifications: Boolean = true,
    val autoRefresh: Boolean = true,
    val widgetSymbols: List<String> = emptyList(),
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
) {
    companion object {
        val DEFAULT_FAVORITES = listOf(
            // فردایی و هرات در جزئیات دلار (نرخ‌های مرتبط) دیده می‌شوند
            "USD", "EUR", "AED", "GBP", "TRY", "CNY", "CAD", "CHF", "AUD", "IQD",
        )
    }
}

class SettingsStore(private val context: Context) {
    private val favoritesKey = stringPreferencesKey("favorites")
    private val starsKey = stringPreferencesKey("stars")
    private val ordersKey = stringPreferencesKey("orders")
    private val viewModeKey = stringPreferencesKey("view_mode")
    private val showBuyKey = booleanPreferencesKey("show_buy")
    private val notificationsKey = booleanPreferencesKey("notifications")
    private val autoRefreshKey = booleanPreferencesKey("auto_refresh")
    private val widgetSymbolsKey = stringPreferencesKey("widget_symbols")
    private val seenAlertsKey = stringPreferencesKey("seen_alerts")
    private val themeModeKey = stringPreferencesKey("theme_mode")
    private val tourDoneKey = booleanPreferencesKey("tour_done")

    val settings: Flow<UserSettings> = context.settingsDataStore.data.map { prefs ->
        UserSettings(
            favorites = prefs[favoritesKey]?.let(::splitList) ?: UserSettings.DEFAULT_FAVORITES,
            stars = prefs[starsKey]?.let(::splitList)?.toSet() ?: emptySet(),
            orders = prefs[ordersKey]?.let(::decodeOrders) ?: emptyMap(),
            viewMode = if (prefs[viewModeKey] == ViewMode.GRID.name) ViewMode.GRID else ViewMode.LIST,
            showBuy = prefs[showBuyKey] ?: true,
            notifications = prefs[notificationsKey] ?: true,
            autoRefresh = prefs[autoRefreshKey] ?: true,
            widgetSymbols = prefs[widgetSymbolsKey]?.let(::splitList) ?: emptyList(),
            themeMode = ThemeMode.entries.firstOrNull { it.name == prefs[themeModeKey] } ?: ThemeMode.SYSTEM,
        )
    }

    /** آیا تور راهنما یک‌بار دیده شده (اپ تا خوانده شدنش تور را باز نمی‌کند) */
    val tourDone: Flow<Boolean> = context.settingsDataStore.data.map { it[tourDoneKey] ?: false }

    suspend fun current(): UserSettings = settings.first()

    suspend fun setFavorites(symbols: List<String>) = put { it[favoritesKey] = symbols.distinct().joinToString(",") }

    suspend fun toggleFavorite(symbol: String) {
        val list = current().favorites.toMutableList()
        if (!list.remove(symbol)) list.add(symbol)
        setFavorites(list)
    }

    suspend fun toggleStar(symbol: String) {
        val stars = current().stars.toMutableSet()
        if (!stars.remove(symbol)) stars.add(symbol)
        put { it[starsKey] = stars.joinToString(",") }
    }

    suspend fun setOrder(category: Category, symbols: List<String>) {
        val orders = current().orders.toMutableMap()
        orders[category] = symbols
        put { it[ordersKey] = encodeOrders(orders) }
    }

    suspend fun setViewMode(mode: ViewMode) = put { it[viewModeKey] = mode.name }
    suspend fun setShowBuy(value: Boolean) = put { it[showBuyKey] = value }
    suspend fun setNotifications(value: Boolean) = put { it[notificationsKey] = value }
    suspend fun setAutoRefresh(value: Boolean) = put { it[autoRefreshKey] = value }
    suspend fun setThemeMode(mode: ThemeMode) = put { it[themeModeKey] = mode.name }
    suspend fun setTourDone(value: Boolean) = put { it[tourDoneKey] = value }
    suspend fun setWidgetSymbols(symbols: List<String>) = put { it[widgetSymbolsKey] = symbols.joinToString(",") }

    /** شناسه‌ی هشدارهای اجراشده‌ای که اعلانشان نمایش داده شده */
    suspend fun seenAlerts(): Set<String> =
        context.settingsDataStore.data.first()[seenAlertsKey]?.let(::splitList)?.toSet() ?: emptySet()

    suspend fun setSeenAlerts(ids: Set<String>) = put { it[seenAlertsKey] = ids.takeLast(300).joinToString(",") }

    private suspend fun put(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        context.settingsDataStore.edit { block(it) }
    }

    private fun splitList(value: String): List<String> = value.split(',').map { it.trim() }.filter { it.isNotEmpty() }

    /** «GOLD:GOLD18,EMAMI;CRYPTO:BTC» */
    private fun encodeOrders(orders: Map<Category, List<String>>): String =
        orders.entries.joinToString(";") { (category, symbols) -> "${category.name}:${symbols.joinToString(",")}" }

    private fun decodeOrders(value: String): Map<Category, List<String>> =
        value.split(';').mapNotNull { part ->
            val (name, symbols) = part.split(':', limit = 2).takeIf { it.size == 2 } ?: return@mapNotNull null
            val category = Category.entries.firstOrNull { it.name == name } ?: return@mapNotNull null
            category to splitList(symbols)
        }.toMap()

    private fun <T> Iterable<T>.takeLast(count: Int): List<T> = toList().let { it.drop((it.size - count).coerceAtLeast(0)) }
}
