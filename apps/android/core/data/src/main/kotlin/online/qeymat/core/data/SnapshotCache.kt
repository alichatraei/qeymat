package online.qeymat.core.data

import android.content.Context
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import online.qeymat.core.model.MarketSnapshot
import online.qeymat.core.network.QeymatJson

/**
 * آخرین اسنپ‌شات بازار روی دیسک — تا اپ و ویجت بدون اینترنت هم
 * آخرین قیمت‌های دیده‌شده را نشان دهند.
 */
class SnapshotCache(context: Context) {
    private val file = File(context.filesDir, "snapshot.json")

    suspend fun read(): MarketSnapshot? = withContext(Dispatchers.IO) {
        runCatching {
            if (!file.exists()) null
            else QeymatJson.decodeFromString(MarketSnapshot.serializer(), file.readText())
        }.getOrNull()
    }

    suspend fun write(snapshot: MarketSnapshot) = withContext(Dispatchers.IO) {
        runCatching {
            val temp = File(file.parentFile, "snapshot.json.tmp")
            temp.writeText(QeymatJson.encodeToString(MarketSnapshot.serializer(), snapshot))
            temp.renameTo(file)
        }
    }
}
