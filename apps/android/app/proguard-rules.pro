# مدل‌های API با kotlinx.serialization — نام فیلدها باید با JSON سرور یکی بماند
-keep class online.qeymat.core.model.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions

# Retrofit با توابع suspend
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keep interface online.qeymat.core.network.QeymatApi { *; }

# Worker‌ها با بازتاب ساخته می‌شوند
-keep class * extends androidx.work.ListenableWorker { <init>(...); }

-dontwarn org.slf4j.**
