package online.qeymat.feature.convert

import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val convertModule = module {
    viewModelOf(::ConvertViewModel)
}
