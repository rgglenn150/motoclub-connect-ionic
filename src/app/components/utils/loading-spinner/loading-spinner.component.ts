import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
})
export class LoadingSpinnerComponent {

  /**
   * Input property to control the visibility of the loading spinner.
   * When this is true, the loader will be displayed.
   * When false, it will be hidden.
   */
  @Input() isLoading: boolean = false;

  constructor() { }

}
