import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter, Router, NavigationEnd, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, isDevMode } from '@angular/core';
import { filter } from 'rxjs';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { AnalyticsService } from './core/services/analytics.service';
import { provideServiceWorker } from '@angular/service-worker';

function initRouteTracking() {
  return () => {
    const router = inject(Router);
    const analytics = inject(AnalyticsService);
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      analytics.trackPage((e as NavigationEnd).urlAfterRedirects);
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initRouteTracking,
      multi: true
    }, provideServiceWorker('custom-sw.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
