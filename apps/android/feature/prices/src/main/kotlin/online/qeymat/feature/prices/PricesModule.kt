package online.qeymat.feature.prices

import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val pricesModule = module {
    viewModelOf(::PricesViewModel)
}
