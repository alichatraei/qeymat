package online.qeymat.core.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import online.qeymat.core.model.Analysis
import online.qeymat.core.model.ChartRange
import online.qeymat.core.model.HistorySeries
import online.qeymat.core.model.MarketSnapshot
import online.qeymat.core.network.ApiException
import online.qeymat.core.network.QeymatApi
import online.qeymat.core.network.apiCall

/**
 * منبع واحد قیمت‌ها برای اپ و ویجت.
 * اسنپ‌شات اول از دیسک خوانده می‌شود تا صفحه بدون انتظار پر شود،
 * بعد از شبکه تازه می‌شود.
 */
class MarketRepository(
    private val api: QeymatApi,
    private val cache: SnapshotCache,
) {
    private val _snapshot = MutableStateFlow<MarketSnapshot?>(null)
    val snapshot: StateFlow<MarketSnapshot?> = _snapshot.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    private val mutex = Mutex()
    private val historyCache = LinkedHashMap<String, Pair<Long, HistorySeries>>()

    suspend fun loadCached(): MarketSnapshot? {
        if (_snapshot.value == null) cache.read()?.let { _snapshot.value = it }
        return _snapshot.value
    }

    suspend fun refresh(): Result<MarketSnapshot> = mutex.withLock {
        _refreshing.value = true
        val result = apiCall { api.rates() }
        result.onSuccess {
            _snapshot.value = it
            _lastError.value = null
            cache.write(it)
        }.onFailure { _lastError.value = it.message }
        _refreshing.value = false
        result
    }

    /** سری نمودار؛ دو دقیقه در حافظه نگه داشته می‌شود */
    suspend fun history(symbol: String, range: ChartRange): Result<HistorySeries> {
        val key = "$symbol:${range.id}"
        historyCache[key]?.let { (at, series) ->
            if (System.currentTimeMillis() - at < 120_000) return Result.success(series)
        }
        return apiCall { api.history(symbol, range.id) }.mapCatching { response ->
            val series = response.series ?: throw ApiException("تاریخچه‌ای برای این دارایی نیست.")
            historyCache[key] = System.currentTimeMillis() to series
            if (historyCache.size > 40) historyCache.remove(historyCache.keys.first())
            series
        }
    }

    suspend fun analysis(symbol: String): Result<Analysis> =
        apiCall { api.analysis(symbol) }.mapCatching {
            it.analysis ?: throw ApiException("تحلیلی برای این دارایی نیست.")
        }
}
