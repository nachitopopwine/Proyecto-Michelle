import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Con @Global() no tendrás que importar PrismaModule en cada archivo
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}