package online.qeymat.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import online.qeymat.app.ui.QeymatAppRoot
import online.qeymat.core.designsystem.QeymatTheme
import online.qeymat.widget.QeymatWidgets

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        // طراحی همیشه تیره است؛ آیکون‌های نوار وضعیت روشن
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent {
            QeymatTheme {
                QeymatAppRoot(versionName = BuildConfig.VERSION_NAME)
            }
        }
    }

    override fun onStop() {
        super.onStop()
        // ویجت‌ها آخرین قیمت‌هایی را که کاربر دیده نشان دهند
        lifecycleScope.launch { QeymatWidgets.updateAll(applicationContext) }
    }
}
