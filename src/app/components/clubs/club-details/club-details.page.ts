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
      // Normalize the response to always have 'id'
      this.club = { ...res, id: res?.id || res?._id };
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
          handler: async () => {
            const clubId = this.club?.id || this.club?._id;
            if (!clubId) {
              console.error('Club not loaded');
              return;
            }
            this.clubService.joinClub(clubId).subscribe({
              next: async () => {
                const success = await this.alertController.create({
                  header: 'Request Sent',
                  message: 'Your request to join has been sent.',
                  buttons: ['OK']
                });
                await success.present();
              },
              error: async (err) => {
                console.error('Error joining club', err);
                const failure = await this.alertController.create({
                  header: 'Join Failed',
                  message: 'Could not send join request. Please try again.',
                  buttons: ['OK']
                });
                await failure.present();
              }
            });
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
