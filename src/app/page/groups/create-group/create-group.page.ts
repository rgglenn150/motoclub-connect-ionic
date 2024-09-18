import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.page.html',
  styleUrls: ['./create-group.page.scss'],
})
export class CreateGroupPage  {
  groupName: string = '';
  description: string = '';
  location: string = '';
  membersCount: number | null = null;

  constructor(
    private http: HttpClient,
    private alertController: AlertController
  ) {}

  async registerGroup() {
    if (!this.groupName || !this.description) {
      const alert = await this.alertController.create({
        header: 'Missing Information',
        message: 'Please fill out all required fields.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const groupData = {
      name: this.groupName,
      description: this.description,
      location: this.location,
      membersCount: this.membersCount,
    };

    this.http.post('https://your-api-url.com/api/groups', groupData).subscribe(
      async (response) => {
        const alert = await this.alertController.create({
          header: 'Success',
          message: 'Group registered successfully!',
          buttons: ['OK'],
        });
        await alert.present();
      },
      async (error) => {
        const alert = await this.alertController.create({
          header: 'Error',
          message:
            'There was a problem registering the group. Please try again.',
          buttons: ['OK'],
        });
        await alert.present();
      }
    );
  }
}
