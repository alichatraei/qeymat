package online.qeymat.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.data.ThemeMode
import online.qeymat.core.data.UserSettings
import online.qeymat.core.data.ViewMode
import online.qeymat.core.model.PlusStatus

data class SettingsUiState(
    val settings: UserSettings = UserSettings(),
    val loggedIn: Boolean = false,
    val phone: String = "",
    val plus: PlusStatus = PlusStatus(),
)

class SettingsViewModel(
    private val store: SettingsStore,
    private val account: AccountRepository,
) : ViewModel() {
    val state: StateFlow<SettingsUiState> =
        combine(store.settings, account.session, account.plus) { settings, session, plus ->
            SettingsUiState(settings, session != null, session?.phone.orEmpty(), plus)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    fun toggleView() = launch { store.setViewMode(if (state.value.settings.viewMode == ViewMode.LIST) ViewMode.GRID else ViewMode.LIST) }
    fun setShowBuy(value: Boolean) = launch { store.setShowBuy(value) }
    fun setNotifications(value: Boolean) = launch { store.setNotifications(value) }
    fun setAutoRefresh(value: Boolean) = launch { store.setAutoRefresh(value) }
    fun setThemeMode(mode: ThemeMode) = launch { store.setThemeMode(mode) }
    fun logout() = launch { account.logout() }

    private fun launch(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }
}
