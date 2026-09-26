package online.qeymat.feature.alerts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.model.AlertsResponse
import online.qeymat.core.model.PlusStatus

data class LoginState(
    val step: Int = 1,
    val phone: String = "",
    val maskedPhone: String = "",
    val code: String = "",
    val busy: Boolean = false,
    val error: String? = null,
)

data class AlertsUiState(
    val loggedIn: Boolean = false,
    val phone: String = "",
    val plus: PlusStatus = PlusStatus(),
    val alerts: AlertsResponse? = null,
    val loadingAlerts: Boolean = false,
    val alertsError: String? = null,
    val login: LoginState = LoginState(),
)

class AlertsViewModel(private val account: AccountRepository) : ViewModel() {
    private val login = MutableStateFlow(LoginState())
    private val alerts = MutableStateFlow<AlertsResponse?>(null)
    private val loading = MutableStateFlow(false)
    private val error = MutableStateFlow<String?>(null)

    val state: StateFlow<AlertsUiState> = combine(
        account.session,
        account.plus,
        combine(alerts, loading, error) { a, l, e -> Triple(a, l, e) },
        login,
    ) { session, plus, (list, busy, failure), loginState ->
        AlertsUiState(
            loggedIn = session != null,
            phone = session?.phone.orEmpty(),
            plus = plus,
            alerts = list,
            loadingAlerts = busy,
            alertsError = failure,
            login = loginState,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AlertsUiState())

    init {
        viewModelScope.launch {
            account.lastPhone()?.let { phone -> login.value = login.value.copy(phone = phone) }
        }
    }

    fun refresh() {
        if (account.session.value == null) return
        viewModelScope.launch {
            loading.value = true
            account.alerts()
                .onSuccess {
                    alerts.value = it
                    error.value = null
                }
                .onFailure { error.value = it.message }
            loading.value = false
        }
    }

    fun setPhone(value: String) {
        login.value = login.value.copy(phone = value.take(16), error = null)
    }

    fun setCode(value: String) {
        val digits = value.filter { it.isDigit() }.take(6)
        login.value = login.value.copy(code = digits, error = null)
        if (digits.length == 5) verify()
    }

    fun sendCode() {
        val current = login.value
        if (current.busy) return
        viewModelScope.launch {
            login.value = current.copy(busy = true, error = null)
            account.sendCode(current.phone)
                .onSuccess { masked -> login.value = login.value.copy(step = 2, maskedPhone = masked, busy = false, code = "") }
                .onFailure { login.value = login.value.copy(busy = false, error = it.message) }
        }
    }

    fun verify() {
        val current = login.value
        if (current.busy || current.code.length < 4) return
        viewModelScope.launch {
            login.value = current.copy(busy = true, error = null)
            account.verify(current.phone, current.code)
                .onSuccess {
                    login.value = LoginState(phone = current.phone)
                    refresh()
                }
                .onFailure { login.value = login.value.copy(busy = false, error = it.message, code = "") }
        }
    }

    fun changePhone() {
        login.value = login.value.copy(step = 1, code = "", error = null)
    }

    fun delete(id: String) {
        viewModelScope.launch {
            account.deleteAlert(id).onSuccess { refresh() }.onFailure { error.value = it.message }
        }
    }
}
