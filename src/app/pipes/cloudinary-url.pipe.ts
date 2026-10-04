import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cloudinaryUrl'
})
export class CloudinaryUrlPipe implements PipeTransform {
  transform(url: string, transforms: string = ''): string {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    const t = transforms ? `${transforms},f_auto,q_auto` : 'f_auto,q_auto';
    return url.replace('/upload/', `/upload/${t}/`);
  }
}
