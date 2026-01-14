import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, viewChild, ElementRef, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ElectionsService } from '../../../core/services/elections.service';
import {
  ElectionDto,
  ElectionResultsDto,
} from '../../../core/models/elections.models';

@Component({
  selector: 'app-admin-election-results',
  standalone: true,
  templateUrl: 'admin-election-results.section.html',
  imports: [CommonModule, RouterLink],
})
export class AdminElectionResultsSection implements OnInit {
  pieChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('pieChart');
  election = signal<ElectionDto | null>(null);
  results = signal<ElectionResultsDto | null>(null);
  
  // UI State
  activeTab = signal<'overview' | 'by-position' | 'by-list' | 'detailed'>('overview');
  loading = signal(false);
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private electionsService: ElectionsService,
    private toastController: ToastController,
  ) {
    // Redraw chart when results change or canvas becomes available
    effect(() => {
      const results = this.results();
      const tab = this.activeTab();
      const canvasRef = this.pieChartCanvas();
      
      if (results && canvasRef && tab === 'overview') {
        // Small delay to ensure canvas is rendered and has dimensions
        setTimeout(() => this.drawPieChart(), 100);
      }
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/elections']);
      return;
    }
    await this.loadElection(id);
    await this.loadResults(id);
  }

  async loadElection(id: string) {
    try {
      this.loading.set(true);
      const data = await firstValueFrom(this.electionsService.get(id));
      this.election.set(data);
    } catch (e) {
      await this.notify('Error al cargar la elección', 'danger');
      this.router.navigate(['/admin/elections']);
    } finally {
      this.loading.set(false);
    }
  }

  async loadResults(id: string) {
    try {
      const data = await firstValueFrom(this.electionsService.getResults(id));
      this.results.set(data);
    } catch (e: any) {
      // Results might not be available if election is not COMPLETED
      if (e.status !== 403) {
        console.error('Error loading results', e);
      }
    }
  }

  drawPieChart() {
    const canvas = this.pieChartCanvas()?.nativeElement;
    const results = this.results();
    
    if (!canvas || !results || results.listResults.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;
    const innerRadius = radius * 0.5; // Donut effect
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let currentAngle = -Math.PI / 2; // Start from top
    const total = results.listResults.reduce((sum: number, list: any) => sum + list.totalVotes, 0);
    
    if (total === 0) {
      ctx.fillStyle = '#999999';
      ctx.textAlign = 'center';
      ctx.font = '14px Arial';
      ctx.fillText('Sin votos registrados', centerX, centerY);
      return;
    }
    
    // Draw slices
    results.listResults.forEach((list, index) => {
      const sliceAngle = (list.totalVotes / total) * 2 * Math.PI;
      if (sliceAngle === 0) return;
      
      const color = this.getColorByListId(list.listId);
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add white border between slices
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      currentAngle += sliceAngle;
    });
    
    // Draw white center circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Final border around the whole chart
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  getScopeLabel(scope: string): string {
    switch (scope) {
      case 'ASSOCIATION': return 'Asociación';
      case 'BRANCH': return 'Sede';
      case 'CHAPTER': return 'Capítulo';
      default: return 'Nacional';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Borrador';
      case 'OPEN': return 'Abierta';
      case 'CLOSED': return 'Cerrada';
      case 'COMPLETED': return 'Completada';
      default: return status;
    }
  }

  setActiveTab(tab: 'overview' | 'by-position' | 'by-list' | 'detailed') {
    this.activeTab.set(tab);
    // Redraw chart when switching to overview tab
    if (tab === 'overview') {
      setTimeout(() => {
        if (this.pieChartCanvas()) this.drawPieChart();
      }, 100);
    }
  }

  get canViewResults(): boolean {
    return this.election()?.status === 'COMPLETED';
  }

  getBarColor(index: number): string {
    const colors = [
      '#1976d2', // Blue
      '#388e3c', // Green
      '#f57c00', // Orange
      '#7b1fa2', // Purple
      '#c62828', // Red
      '#0097a7', // Cyan
      '#fbc02d', // Yellow
      '#5d4037', // Brown
      '#455a64', // Blue Grey
      '#e91e63', // Pink
    ];
    return colors[index % colors.length];
  }

  getColorByListId(listId: string): string {
    const results = this.results();
    if (!results) return this.getBarColor(0);
    
    // Find the index of this list in the results
    const listIndex = results.listResults.findIndex(list => list.listId === listId);
    return this.getBarColor(listIndex >= 0 ? listIndex : 0);
  }

  getWinnerByPosition(positionId: string) {
    const results = this.results();
    if (!results) return null;
    
    const position = results.positionResults.find(p => p.positionId === positionId);
    if (!position || position.candidates.length === 0) return null;
    
    // Return candidate with highest vote count
    return position.candidates.reduce((winner, candidate) => 
      candidate.voteCount > winner.voteCount ? candidate : winner
    );
  }

  private async notify(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
    });
    await toast.present();
  }

  exportToPDF() {
    const results = this.results();
    const election = this.election();
    
    if (!results || !election) {
      this.notify('No hay resultados para exportar', 'warning');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    
    // Helper function to draw progress bar
    const drawProgressBar = (x: number, y: number, width: number, percentage: number, color: string) => {
      // Background
      doc.setFillColor(240, 240, 240);
      doc.rect(x, y, width, 6, 'F');
      
      // Progress
      const progressWidth = (width * percentage) / 100;
      const rgb = this.hexToRgb(color);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(x, y, progressWidth, 6, 'F');
      
      // Border
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, width, 6, 'S');
    };
    
    // Helper function to draw pie chart
    const drawPieChart = (centerX: number, centerY: number, radius: number, data: Array<{value: number, color: string, label: string}>) => {
      let currentAngle = -Math.PI / 2; // Start from top
      const total = data.reduce((sum, item) => sum + item.value, 0);
      
      if (total === 0) return;
      
      data.forEach((item) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const rgb = this.hexToRgb(item.color);
        
        // Draw slice
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);
        
        // Create arc path
        const startX = centerX + radius * Math.cos(currentAngle);
        const startY = centerY + radius * Math.sin(currentAngle);
        
        doc.moveTo(centerX, centerY);
        doc.lineTo(startX, startY);
        
        // Draw arc
        const steps = Math.max(10, Math.floor(sliceAngle * 20));
        for (let i = 1; i <= steps; i++) {
          const angle = currentAngle + (sliceAngle * i) / steps;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          doc.lineTo(x, y);
        }
        
        doc.lineTo(centerX, centerY);
        doc.fill();
        doc.stroke();
        
        currentAngle += sliceAngle;
      });
      
      // Draw white center circle for donut effect
      doc.setFillColor(255, 255, 255);
      doc.circle(centerX, centerY, radius * 0.5, 'F');
    };
    
    // Header with background
    doc.setFillColor(60, 141, 188);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RESULTADOS DE ELECCIÓN', pageWidth / 2, 18, { align: 'center' });
    
    // Election info
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(election.name, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`${this.getScopeLabel(election.scope)} • ${this.getStatusLabel(election.status)}`, pageWidth / 2, 37, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 55;
    
    // Summary boxes
    const boxWidth = (pageWidth - 42) / 3;
    const boxHeight = 25;
    const boxY = yPos;
    
    // Box 1: Total Votos
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, boxY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 141, 188);
    doc.text(results.totalVotes.toString(), 14 + boxWidth / 2, boxY + 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Total de Votos', 14 + boxWidth / 2, boxY + 20, { align: 'center' });
    
    // Box 2: Listas
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14 + boxWidth + 7, boxY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 141, 188);
    doc.text(results.listResults.length.toString(), 14 + boxWidth + 7 + boxWidth / 2, boxY + 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Listas Participantes', 14 + boxWidth + 7 + boxWidth / 2, boxY + 20, { align: 'center' });
    
    // Box 3: Cargos
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14 + (boxWidth + 7) * 2, boxY, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 141, 188);
    doc.text(results.positionResults.length.toString(), 14 + (boxWidth + 7) * 2 + boxWidth / 2, boxY + 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Cargos en Disputa', 14 + (boxWidth + 7) * 2 + boxWidth / 2, boxY + 20, { align: 'center' });
    
    yPos = boxY + boxHeight + 15;
    doc.setTextColor(0, 0, 0);
    
    // Pie chart section - Results by List
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 141, 188);
    doc.text('Distribución de Votos por Lista', 14, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    
    // Draw pie chart for all lists
    const listChartData = results.listResults.map((list, idx) => ({
      value: list.totalVotes,
      color: this.getBarColor(idx),
      label: list.listName
    }));
    
    // Chart on the right side
    const chartCenterX = pageWidth - 50;
    const chartY = yPos + 35;
    const chartRadius = 30;
    
    drawPieChart(chartCenterX, chartY, chartRadius, listChartData);
    
    // Legend on the left side - single column
    let legendY = yPos + 5;
    const legendX = 14;
    
    results.listResults.forEach((list, idx) => {
      const color = this.getBarColor(idx);
      const rgb = this.hexToRgb(color);
      
      // Color box
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(legendX, legendY - 3, 4, 4, 0.5, 0.5, 'F');
      
      // Label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const labelText = list.listName.length > 35 ? list.listName.substring(0, 32) + '...' : list.listName;
      doc.text(labelText, legendX + 7, legendY);
      
      // Percentage
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text(`${list.percentage.toFixed(1)}%`, legendX + 85, legendY);
      
      legendY += 6;
    });
    
    // Update yPos to be after the chart or legend, whichever is lower
    const chartBottom = chartY + chartRadius + 10;
    const legendBottom = legendY + 5;
    yPos = Math.max(chartBottom, legendBottom);
    
    // Winners section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 141, 188);
    doc.text('Ganadores por Cargo', 14, yPos);
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    
    results.positionResults.forEach((position, index) => {
      const winner = this.getWinnerByPosition(position.positionId);
      if (winner) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        // Position title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(position.positionTitle, 14, yPos);
        yPos += 6;
        
        // Winner info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${winner.candidateName}`, 20, yPos);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`${winner.listName}`, 20, yPos + 5);
        
        // Votes and percentage
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 141, 188);
        doc.text(`${winner.voteCount} votos`, pageWidth - 60, yPos);
        doc.setFontSize(9);
        doc.text(`${winner.percentage.toFixed(1)}%`, pageWidth - 60, yPos + 5);
        
        yPos += 10;
        
        // Progress bar
        const color = this.getColorByListId(winner.listId);
        drawProgressBar(20, yPos, pageWidth - 80, winner.percentage, color);
        
        yPos += 12;
      }
    });
    
    // Detailed results pages
    results.positionResults.forEach((position, posIndex) => {
      doc.addPage();
      
      // Calculate total votes for this position
      const positionTotalVotes = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);
      
      // Header
      doc.setFillColor(60, 141, 188);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(position.positionTitle, pageWidth / 2, 18, { align: 'center' });
      
      // Total votes subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de votos: ${positionTotalVotes}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      yPos = 45;
      
      // Candidates with progress bars
      position.candidates.forEach((candidate, candIndex) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
        
        // Candidate name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(candidate.candidateName, 14, yPos);
        
        // List name
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(candidate.listName, 14, yPos + 5);
        doc.setTextColor(0, 0, 0);
        
        // Votes and percentage
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${candidate.voteCount} votos`, pageWidth - 60, yPos);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${candidate.percentage.toFixed(2)}%`, pageWidth - 60, yPos + 5);
        
        yPos += 10;
        
        // Progress bar with color
        const color = this.getColorByListId(candidate.listId);
        drawProgressBar(14, yPos, pageWidth - 28, candidate.percentage, color);
        
        yPos += 15;
      });
    });
    
    // Results by List section
    doc.addPage();
    
    // Header
    doc.setFillColor(60, 141, 188);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Resultados por Lista', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 45;
    
    results.listResults.forEach((list, listIndex) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      // List header
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 30, 3, 3, 'F');
      
      // List name and number
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(list.listName, 20, yPos + 10);
      
      // Party name and number
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      let subtitle = '';
      if (list.listNumber) subtitle += `N° ${list.listNumber}`;
      if (list.partyName) subtitle += (subtitle ? ' • ' : '') + list.partyName;
      if (subtitle) doc.text(subtitle, 20, yPos + 17);
      
      // Total votes and percentage
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 141, 188);
      doc.text(`${list.totalVotes} votos`, pageWidth - 60, yPos + 10);
      doc.setFontSize(9);
      doc.text(`${list.percentage.toFixed(2)}%`, pageWidth - 60, yPos + 17);
      
      yPos += 35;
      
      // Progress bar for list
      const listColor = this.getBarColor(listIndex);
      drawProgressBar(14, yPos, pageWidth - 28, list.percentage, listColor);
      
      yPos += 15;
      
      // Candidates breakdown
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Candidatos:', 20, yPos);
      yPos += 7;
      
      list.candidates.forEach((candidate, candIndex) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`• ${candidate.candidateName}`, 25, yPos);
        
        doc.setTextColor(100, 100, 100);
        doc.text(`${candidate.positionTitle}`, 100, yPos);
        
        doc.setTextColor(60, 141, 188);
        doc.setFont('helvetica', 'bold');
        doc.text(`${candidate.voteCount} votos`, pageWidth - 60, yPos);
        
        yPos += 6;
      });
      
      yPos += 10;
    });
    
    // Footer on last page
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
    
    // Save PDF
    const fileName = `resultados_${election.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.notify('PDF exportado exitosamente');
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 60, g: 141, b: 188 };
  }
}
