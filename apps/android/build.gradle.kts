// پلاگین‌ها فقط این‌جا تعریف می‌شوند؛ هر ماژول آن‌هایی را که لازم دارد اعمال می‌کند.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
