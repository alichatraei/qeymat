package online.qeymat.core.data

import online.qeymat.core.network.Network
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

/**
 * وابستگی‌های لایه‌ی داده.
 * @param clientTag شناسه‌ی نسخه‌ی اپ برای سرور، مثل «android/2.0.0»
 */
fun dataModule(clientTag: String, debug: Boolean) = module {
    single { SessionStore(androidContext()) }
    single { SettingsStore(androidContext()) }
    single { SnapshotCache(androidContext()) }
    single {
        val session = get<SessionStore>()
        Network.create(tokenProvider = { session.currentToken() }, clientTag = clientTag, debug = debug)
    }
    single { MarketRepository(get(), get()) }
    single { AccountRepository(get(), get()) }
}
