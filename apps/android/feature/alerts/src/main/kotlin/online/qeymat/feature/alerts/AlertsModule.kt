package online.qeymat.feature.alerts

import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val alertsModule = module {
    viewModelOf(::AlertsViewModel)
}
