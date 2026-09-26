pluginManagement {
    repositories {
        // گوگل مِیوِن از ایران در دسترس نیست. روی سیستم داخل ایران در
        // gradle.properties کاربر (~/.gradle/gradle.properties) بگذارید:
        //   qeymat.useMirror=true
        // تا وابستگی‌ها از آینه‌ی عمومی Aliyun گرفته شوند. CI گیت‌هاب مستقیم می‌گیرد.
        if (providers.gradleProperty("qeymat.useMirror").orNull == "true") {
            maven("https://maven.aliyun.com/repository/google")
            maven("https://maven.aliyun.com/repository/gradle-plugin")
            maven("https://maven.aliyun.com/repository/central")
        }
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        if (providers.gradleProperty("qeymat.useMirror").orNull == "true") {
            maven("https://maven.aliyun.com/repository/google")
            maven("https://maven.aliyun.com/repository/central")
        }
        google()
        mavenCentral()
    }
}

rootProject.name = "Qeymat"

include(":app")
include(":core:model")
include(":core:network")
include(":core:data")
include(":core:designsystem")
include(":feature:prices")
include(":feature:convert")
include(":feature:alerts")
include(":feature:settings")
include(":widget")
