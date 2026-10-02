import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// نسخه از تگ گیت می‌آید (در CI: gradle -PappVersion=2.1.0). versionCode از همان
// ساخته می‌شود و با هر نسخه بزرگ‌تر است؛ بازار و مایکت نسخه‌ی کوچک‌تر یا برابر را نمی‌پذیرند.
val appVersion = (findProperty("appVersion") as String?)?.removePrefix("v") ?: "2.0.0"
val appVersionCode = appVersion.substringBefore("-").split(".").map { it.toInt() }
    .let { parts -> parts.getOrElse(0) { 0 } * 10_000 + parts.getOrElse(1) { 0 } * 100 + parts.getOrElse(2) { 0 } }

// امضای نسخه‌ی انتشار از keystore.properties (در گیت نیست)؛ نبودش یعنی APK بدون امضا
val keystoreFile = rootProject.file("keystore.properties")
val keystore = Properties().apply { if (keystoreFile.exists()) keystoreFile.inputStream().use(::load) }

android {
    namespace = "online.qeymat.app"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "online.qeymat"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = appVersionCode
        versionName = appVersion
    }

    signingConfigs {
        if (keystoreFile.exists()) {
            create("release") {
                storeFile = rootProject.file(keystore.getProperty("storeFile"))
                storePassword = keystore.getProperty("storePassword")
                keyAlias = keystore.getProperty("keyAlias")
                keyPassword = keystore.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystoreFile.exists()) signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // تصویر صفحه‌ها بدون شبیه‌ساز (Robolectric + Roborazzi):
    //   gradle :app:testDebugUnitTest --tests '*ScreenshotTest*' -Pqeymat.screenshots=true
    // خروجی در app/build/screens
    testOptions {
        unitTests.isIncludeAndroidResources = true
        unitTests.all { test ->
            val record = providers.gradleProperty("qeymat.screenshots").orNull == "true"
            test.systemProperty("roborazzi.test.record", record.toString())
            test.systemProperty("qeymat.screenshots", record.toString())
            test.maxHeapSize = "3g"
        }
    }

    packaging {
        resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/versions/9/previous-compilation-data.bin")
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation(project(":core:designsystem"))
    implementation(project(":core:data"))
    implementation(project(":feature:prices"))
    implementation(project(":feature:convert"))
    implementation(project(":feature:alerts"))
    implementation(project(":feature:settings"))
    implementation(project(":widget"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.koin.androidx.compose)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(platform(libs.androidx.compose.bom))
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
}
