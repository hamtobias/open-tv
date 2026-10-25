import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SetupComponent } from './setup/setup.component';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';
import { GuideComponent } from './guide/guide.component';

const routes: Routes = [
  {path: "", component: HomeComponent},
  {path: "setup", component: SetupComponent},
  {path: "settings", component: SettingsComponent},
  {path: "guide", component: GuideComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
