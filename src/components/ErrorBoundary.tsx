import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * حاجز الأخطاء العام (ErrorBoundary) — كان التطبيق بلا أي حماية:
 * أي انهيار في مساحة عمل واحدة كان يُسقط المنظومة كلها بشاشة بيضاء.
 * الآن يُعزل الانهيار في شاشة استرجاع احترافية تسمح بإعادة التحميل أو العودة للبوابة.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // توثيق الانهيار في وحدة التحكم لتشخيصه من الحقل أو من أدوات المطور
    console.error('[ErrorBoundary] انهيار غير معالج في الواجهة:', error, info.componentStack);
    try {
      const log = JSON.parse(localStorage.getItem('photo_finish_error_log') || '[]');
      log.unshift({
        at: new Date().toISOString(),
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        component: info.componentStack?.slice(0, 500),
      });
      localStorage.setItem('photo_finish_error_log', JSON.stringify(log.slice(0, 20)));
    } catch {
      /* التخزين غير متاح — لا شيء يمنع العرض */
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      window.location.href = window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-slate-950 p-4 safe-px"
          role="alert"
        >
          <div className="glass-card-strong max-w-md w-full p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-100">
                حدث خلل غير متوقع في الواجهة
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                تم عزل الخلل ومنع تأثر بقية المنظومة. لا تقلق — بيانات السباق محفوظة محلياً.
                جرّب إعادة التحميل، وإن تكرر الخلل تواصل مع فريق الدعم.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-24 overflow-y-auto text-right" dir="ltr">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="judge-touch-button px-5 bg-slate-100 text-slate-950 hover:bg-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                إعادة التحميل
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="judge-touch-button px-5 bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                البوابة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
