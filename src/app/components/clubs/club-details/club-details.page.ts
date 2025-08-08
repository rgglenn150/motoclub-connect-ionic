import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ClubService } from 'src/app/service/club.service';

@Component({
  selector: 'app-club-details',
  templateUrl: './club-details.page.html',
  styleUrls: ['./club-details.page.scss'],
})
export class ClubDetailsPage implements OnInit {
  club: any;
  events: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private clubService: ClubService,
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getClubDetails(id);
      this.getClubEvents(id);
    }
  }

  getClubDetails(id: string) {
    this.clubService.getClubDetails(id).subscribe((res: any) => {
      this.club = res;
      console.log('Club details:', this.club);
    }, error => {
      console.error('Error fetching club details:', error);
      this.club = null; // Reset club if there's an error
    });
  }

  getClubEvents(id: string) {
    this.clubService.getClubEvents(id).subscribe((res: any) => {
      this.events = res;
    });
  }

  async joinClub() {
    const alert = await this.alertController.create({
      header: 'Join Club',
      message: 'Are you sure you want to request to join this club?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Join',
          handler: () => {
            console.log('Joining club...');
          },
        },
      ],
    });

    await alert.present();
  }

  async inviteMember() {
    const alert = await this.alertController.create({
      header: 'Invite Member',
      inputs: [
        {
          name: 'username',
          type: 'text',
          placeholder: 'Enter username'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Invite',
          handler: (data) => {
            if (data.username) {
              this.clubService.addMember(this.club.id, { username: data.username }).subscribe(res => {
                console.log('Member invited successfully', res);
                this.getClubDetails(this.club.id);
              }, error => {
                console.error('Error inviting member', error);
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  goToCreateEvent() {
    console.log('Navigating to create event for club:', this.club);
    if (!this.club || !this.club.id) {
      console.error('Cannot create event: Club data is not available.');
      return;
    }
    this.router.navigate(['/create-event', { clubId: this.club.id }]);
  }
}
