'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ChessPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = canvas.width;
    const CS = S / 8;

    const PIECES: Record<string, string> = {
      K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
      k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
    };

    const INIT = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];

    let board: any[][] = [];
    let turn = 'w';
    let selected: number[] | null = null;
    let validMoves: any[] = [];
    let gameOver = false;
    let captured: Record<string, string[]> = { w: [], b: [] };
    let moveLog: string[] = [];
    let moveCount = 0;
    let enPassantTarget: number[] | null = null;
    let castlingRights: Record<string, boolean> = { K: true, Q: true, k: true, q: true };
    let pvcMode = false;
    let thinking = false;
    let pendingPromo: any = null;

    const isWhite = (p: any) => p && p === p.toUpperCase() && p !== 0;
    const isBlack = (p: any) => p && p === p.toLowerCase() && p !== 0;
    const colorOf = (p: any): string | null => { if (!p || p === 0) return null; return isWhite(p) ? 'w' : 'b'; };
    const typeOf = (p: any): string | null => { if (!p || p === 0) return null; return p.toUpperCase(); };
    const enemyColor = (c: string) => c === 'w' ? 'b' : 'w';
    const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

    function generateMoves(r: number, c: number, checkKingSafety = true): any[] {
      const p = board[r][c];
      if (!p) return [];
      const color = colorOf(p)!;
      const type = typeOf(p)!;
      const moves: any[] = [];
      const enemy = enemyColor(color);

      const addIf = (nr: number, nc: number) => {
        if (!inBounds(nr, nc)) return false;
        const t = board[nr][nc];
        if (t === 0) { moves.push([nr, nc]); return true; }
        if (colorOf(t) === enemy) { moves.push([nr, nc]); return false; }
        return false;
      };

      switch (type) {
        case 'P': {
          const dir = color === 'w' ? -1 : 1;
          const startRow = color === 'w' ? 6 : 1;
          const promoRow = color === 'w' ? 0 : 7;
          const nr = r + dir;
          if (inBounds(nr, c) && board[nr][c] === 0) {
            if (nr === promoRow) ['Q','R','B','N'].forEach(pt => moves.push([nr, c, pt]));
            else moves.push([nr, c]);
            if (r === startRow && board[r + 2 * dir][c] === 0) moves.push([r + 2 * dir, c]);
          }
          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (inBounds(nr, nc)) {
              const t = board[nr][nc];
              if (t !== 0 && colorOf(t) === enemy) {
                if (nr === promoRow) ['Q','R','B','N'].forEach(pt => moves.push([nr, nc, pt]));
                else moves.push([nr, nc]);
              }
              if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) moves.push([nr, nc, 'ep']);
            }
          }
          break;
        }
        case 'N': {
          for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) { const t = board[nr][nc]; if (t === 0 || colorOf(t) === enemy) moves.push([nr, nc]); }
          }
          break;
        }
        case 'B': {
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            for (let s = 1; s < 8; s++) { if (!addIf(r + dr * s, c + dc * s)) break; }
          }
          break;
        }
        case 'R': {
          for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            for (let s = 1; s < 8; s++) { if (!addIf(r + dr * s, c + dc * s)) break; }
          }
          break;
        }
        case 'Q': {
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
            for (let s = 1; s < 8; s++) { if (!addIf(r + dr * s, c + dc * s)) break; }
          }
          break;
        }
        case 'K': {
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) { const t = board[nr][nc]; if (t === 0 || colorOf(t) === enemy) moves.push([nr, nc]); }
          }
          const row = color === 'w' ? 7 : 0;
          if (r === row && c === 4) {
            if (castlingRights[color === 'w' ? 'K' : 'k'] && board[row][5] === 0 && board[row][6] === 0 && board[row][7] === (color === 'w' ? 'R' : 'r')) {
              if (!isAttacked(row, 4, enemy) && !isAttacked(row, 5, enemy) && !isAttacked(row, 6, enemy)) moves.push([row, 6, 'K']);
            }
            if (castlingRights[color === 'w' ? 'Q' : 'q'] && board[row][3] === 0 && board[row][2] === 0 && board[row][1] === 0 && board[row][0] === (color === 'w' ? 'R' : 'r')) {
              if (!isAttacked(row, 4, enemy) && !isAttacked(row, 3, enemy) && !isAttacked(row, 2, enemy)) moves.push([row, 2, 'Q']);
            }
          }
          break;
        }
      }

      if (!checkKingSafety) return moves;
      return moves.filter((m: any) => {
        const fr = r, fc = c, tr = m[0], tc = m[1];
        const saved = board[tr][tc];
        const savedEP = enPassantTarget;
        const savedCR = { ...castlingRights };
        board[tr][tc] = board[fr][fc];
        board[fr][fc] = 0;
        if (m[2] === 'ep') board[r][tc] = 0;
        if (m[2] === 'K' || m[2] === 'Q') {
          const rookFrom = m[2] === 'K' ? 7 : 0;
          const rookTo = m[2] === 'K' ? 5 : 3;
          board[fr][rookTo] = board[fr][rookFrom];
          board[fr][rookFrom] = 0;
        }
        const kingPos = findKing(color);
        const safe = kingPos && !isAttacked(kingPos[0], kingPos[1], enemy);
        board[fr][fc] = board[tr][tc];
        board[tr][tc] = saved;
        if (m[2] === 'ep') board[r][tc] = (color === 'w' ? 'p' : 'P');
        if (m[2] === 'K') { board[fr][7] = board[fr][5]; board[fr][5] = 0; }
        if (m[2] === 'Q') { board[fr][0] = board[fr][3]; board[fr][3] = 0; }
        return safe;
      });
    }

    function findKing(color: string): number[] | null {
      const piece = color === 'w' ? 'K' : 'k';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === piece) return [r, c];
      return null;
    }

    function isAttacked(r: number, c: number, byColor: string): boolean {
      for (let rr = 0; rr < 8; rr++) {
        for (let cc = 0; cc < 8; cc++) {
          const p = board[rr][cc];
          if (!p || colorOf(p) !== byColor) continue;
          const type = typeOf(p)!;
          const dr = r - rr, dc = c - cc;
          const adr = Math.abs(dr), adc = Math.abs(dc);
          if (type === 'P') { const dir = byColor === 'w' ? -1 : 1; if (dr === dir && adc === 1) return true; }
          if (type === 'N') { if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) return true; }
          if (type === 'B' || type === 'Q') {
            if (adr === adc && adr > 0) {
              const sd = dr / adr, sc = dc / adc;
              let clear = true;
              for (let s = 1; s < adr; s++) if (board[rr + s * sd][cc + s * sc] !== 0) { clear = false; break; }
              if (clear) return true;
            }
          }
          if (type === 'R' || type === 'Q') {
            if ((adr === 0 && adc > 0) || (adc === 0 && adr > 0)) {
              const sd = dr === 0 ? 0 : dr / adr;
              const sc = dc === 0 ? 0 : dc / adc;
              let clear = true;
              const steps = Math.max(adr, adc);
              for (let s = 1; s < steps; s++) if (board[rr + s * sd][cc + s * sc] !== 0) { clear = false; break; }
              if (clear) return true;
            }
          }
          if (type === 'K') { if (adr <= 1 && adc <= 1 && (adr > 0 || adc > 0)) return true; }
        }
      }
      return false;
    }

    function hasLegalMoves(color: string): boolean {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
        if (board[r][c] && colorOf(board[r][c]) === color) { if (generateMoves(r, c, true).length > 0) return true; }
      return false;
    }

    const MATERIAL: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

    const PST: Record<string, number[][]> = {
      P: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
      N: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
      B: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,10,15,15,10,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,5,10,10,5,0,-10],[-10,10,10,15,15,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
      R: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
      Q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
      K: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
    };

    function evaluate(color: string): number {
      let score = 0;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = board[r][c]; if (!p) continue;
        const type = typeOf(p)!; const val = MATERIAL[type] || 0;
        const pst = PST[type] || PST.P;
        const posScore = pst[color === 'w' ? r : 7 - r][color === 'w' ? c : 7 - c] || 0;
        if (colorOf(p) === color) score += val + posScore; else score -= val + posScore;
      }
      return score;
    }

    function getAllMoves(color: string, checkSafe = true) {
      const all: any[] = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
        if (board[r][c] && colorOf(board[r][c]) === color)
          generateMoves(r, c, checkSafe).forEach((m: any) => all.push({ fr: r, fc: c, tr: m[0], tc: m[1], flag: m[2] || null }));
      return all;
    }

    function applyMove(move: any) {
      const { fr, fc, tr, tc, flag } = move;
      const piece = board[fr][fc]; const saved = board[tr][tc];
      const savedEP = enPassantTarget; const savedCR = { ...castlingRights };
      const color = colorOf(piece)!;
      if (typeOf(piece) === 'K' && flag === 'K') {
        board[tr][tc] = piece; board[fr][fc] = 0; board[fr][5] = board[fr][7]; board[fr][7] = 0;
      } else if (typeOf(piece) === 'K' && flag === 'Q') {
        board[tr][tc] = piece; board[fr][fc] = 0; board[fr][3] = board[fr][0]; board[fr][0] = 0;
      } else if (flag === 'ep') {
        board[tr][tc] = piece; board[fr][fc] = 0; board[fr][tc] = 0;
      } else if (typeOf(piece) === 'P' && flag && flag !== 'ep' && flag !== 'K' && flag !== 'Q') {
        board[tr][tc] = color === 'w' ? flag : flag.toLowerCase(); board[fr][fc] = 0;
      } else {
        board[tr][tc] = piece; board[fr][fc] = 0;
      }
      return { saved, savedEP, savedCR, piece };
    }

    function undoMove(move: any, state: any) {
      const { fr, fc, tr, tc, flag } = move;
      const color = colorOf(board[tr][tc]);
      const isPromo = state.piece && typeOf(state.piece) === 'P' && flag && flag !== 'ep' && flag !== 'K' && flag !== 'Q';
      board[fr][fc] = isPromo ? state.piece : board[tr][tc];
      board[tr][tc] = state.saved;
      enPassantTarget = state.savedEP;
      castlingRights = state.savedCR;
      if (flag === 'ep') board[fr][tc] = (color === 'w' ? 'p' : 'P');
      if (flag === 'K') { board[fr][7] = board[fr][5]; board[fr][5] = 0; }
      if (flag === 'Q') { board[fr][0] = board[fr][3]; board[fr][3] = 0; }
    }

    function minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean, aiColor: string): any {
      const humanColor = enemyColor(aiColor);
      if (depth === 0) return { score: evaluate(aiColor) };
      const color = isMaximizing ? aiColor : humanColor;
      const moves = getAllMoves(color, true);
      if (moves.length === 0) {
        const king = findKing(color);
        if (king && isAttacked(king[0], king[1], enemyColor(color)))
          return { score: isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth) };
        return { score: 0 };
      }
      moves.sort((a: any, b: any) => (MATERIAL[typeOf(board[a.tr][a.tc])!] || 0) - (MATERIAL[typeOf(board[b.tr][b.tc])!] || 0));
      let best: any = { score: isMaximizing ? -Infinity : Infinity };
      for (const move of moves) {
        const st = applyMove(move);
        const result = minimax(depth - 1, alpha, beta, !isMaximizing, aiColor);
        undoMove(move, st);
        if (isMaximizing) { if (result.score > best.score) best = { score: result.score, move }; alpha = Math.max(alpha, best.score); }
        else { if (result.score < best.score) best = { score: result.score, move }; beta = Math.min(beta, best.score); }
        if (beta <= alpha) break;
      }
      return best;
    }

    function aiMoveFn() {
      if (gameOver || turn !== 'b') return;
      thinking = true;
      setTimeout(() => {
        const result = minimax(3, -Infinity, Infinity, true, 'b');
        if (result.move) doMove(result.move.fr, result.move.fc, result.move.tr, result.move.tc, result.move.flag);
        thinking = false;
      }, 200);
    }

    function toAlg(r: number, c: number) { return 'abcdefgh'[c] + (8 - r); }

    function formatMove(piece: any, fr: number, fc: number, tr: number, tc: number, captured: boolean, promotion: any, castle: any, isEP?: boolean) {
      if (castle === 'K') return 'O-O';
      if (castle === 'Q') return 'O-O-O';
      let s = '';
      if (typeOf(piece) === 'P') { if (captured || isEP) s = toAlg(fr, fc)[0] + 'x'; s += toAlg(tr, tc); if (promotion) s += '=' + promotion; }
      else { s += typeOf(piece); if (captured) s += 'x'; s += toAlg(tr, tc); }
      return s;
    }

    function doMove(fr: number, fc: number, tr: number, tc: number, flag: any) {
      const piece = board[fr][fc]; const capturedPiece = board[tr][tc];
      const color = colorOf(piece)!; const enemy = enemyColor(color);
      let moveStr = '';
      const isKing = typeOf(piece) === 'K'; const isPawn = typeOf(piece) === 'P';

      if (isKing && (flag === 'K' || flag === 'Q')) {
        const isKingside = flag === 'K';
        board[tr][tc] = piece; board[fr][fc] = 0;
        const rookFrom = isKingside ? 7 : 0; const rookTo = isKingside ? 5 : 3;
        board[fr][rookTo] = board[fr][rookFrom]; board[fr][rookFrom] = 0;
        moveStr = formatMove(piece, fr, fc, tr, tc, false, null, flag);
        if (color === 'w') { castlingRights.K = false; castlingRights.Q = false; } else { castlingRights.k = false; castlingRights.q = false; }
      } else if (flag === 'ep') {
        board[tr][tc] = piece; board[fr][fc] = 0; board[fr][tc] = 0;
        captured[color].push(board[fr][tc]);
        moveStr = formatMove(piece, fr, fc, tr, tc, true, null, null, true);
      } else if (isPawn && flag && flag !== 'ep') {
        board[tr][tc] = color === 'w' ? flag : flag.toLowerCase(); board[fr][fc] = 0;
        if (capturedPiece) captured[color].push(capturedPiece);
        moveStr = formatMove(piece, fr, fc, tr, tc, !!capturedPiece, flag, null);
      } else {
        board[tr][tc] = piece; board[fr][fc] = 0;
        if (capturedPiece) captured[color].push(capturedPiece);
        moveStr = formatMove(piece, fr, fc, tr, tc, !!capturedPiece, null, null);
      }

      if (typeOf(piece) === 'P' && flag !== 'ep' && Math.abs(tr - fr) === 2) enPassantTarget = [(fr + tr) / 2, fc];
      else enPassantTarget = null;

      if (typeOf(piece) === 'K') { if (color === 'w') { castlingRights.K = false; castlingRights.Q = false; } else { castlingRights.k = false; castlingRights.q = false; } }
      if (typeOf(piece) === 'R') {
        if (fr === 7 && fc === 0) castlingRights.Q = false;
        if (fr === 7 && fc === 7) castlingRights.K = false;
        if (fr === 0 && fc === 0) castlingRights.q = false;
        if (fr === 0 && fc === 7) castlingRights.k = false;
      }

      moveCount++;
      const num = Math.ceil(moveCount / 2);
      moveStr = (color === 'w' ? num + '. ' : num + '... ') + moveStr;

      const enemyKing = findKing(enemy);
      if (enemyKing && isAttacked(enemyKing[0], enemyKing[1], color)) {
        moveStr += hasLegalMoves(enemy) ? '+' : '#';
      }

      moveLog.push(moveStr);
      turn = enemy;
      selected = null;
      validMoves = [];

      const king = findKing(turn);
      if (king && isAttacked(king[0], king[1], enemyColor(turn))) {
        if (!hasLegalMoves(turn)) { gameOver = true; }
      } else if (!hasLegalMoves(turn)) { gameOver = true; }

      drawBoard();
      if (pvcMode && turn === 'b') aiMoveFn();
    }

    function drawBoard() {
      const s = CS;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
        ctx.fillRect(c * s, r * s, s, s);
      }
      if (selected) { ctx.fillStyle = 'rgba(255,255,0,0.35)'; ctx.fillRect(selected[1] * s, selected[0] * s, s, s); }
      for (const [mr, mc] of validMoves) {
        const t = board[mr][mc];
        if (t !== 0) { ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.fillRect(mc * s, mr * s, s, s); }
        else { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(mc * s + s / 2, mr * s + s / 2, 8, 0, 2 * Math.PI); ctx.fill(); }
      }
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = board[r][c]; if (!p) continue;
        ctx.font = `${s * 0.82}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 3;
        ctx.fillStyle = isWhite(p) ? '#fff' : '#1a1a1a';
        ctx.fillText(PIECES[p], c * s + s / 2, r * s + s / 2 + 1);
        ctx.shadowBlur = 0; ctx.strokeStyle = isWhite(p) ? '#888' : '#000'; ctx.lineWidth = 0.5;
        ctx.strokeText(PIECES[p], c * s + s / 2, r * s + s / 2 + 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${s * 0.15}px Arial`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      for (let i = 0; i < 8; i++) { ctx.fillText('abcdefgh'[i], i * s + 2, 8 * s - 12); ctx.fillText('' + (8 - i), 2, i * s + 2); }
    }

    function handleClick(mx: number, my: number) {
      if (gameOver || thinking) return;
      const c = Math.floor(mx / CS); const r = Math.floor(my / CS);
      if (!inBounds(r, c)) return;
      const piece = board[r][c];
      if (selected) {
        if (r === selected[0] && c === selected[1]) { selected = null; validMoves = []; drawBoard(); return; }
        const move = validMoves.find((m: any) => m[0] === r && m[1] === c);
        if (move) {
          const selPiece = board[selected[0]][selected[1]];
          const promoRow = colorOf(selPiece) === 'w' ? 0 : 7;
          if (typeOf(selPiece) === 'P' && r === promoRow && move[2]) {
            pendingPromo = { fr: selected[0], fc: selected[1], tr: r, tc: c, flag: move[2] };
            const modal = document.getElementById('promoModal');
            if (modal) modal.style.display = 'flex';
            return;
          }
          doMove(selected[0], selected[1], r, c, move[2] || null);
          return;
        }
        if (piece && colorOf(piece) === turn) { selected = [r, c]; validMoves = generateMoves(r, c, true); drawBoard(); return; }
        selected = null; validMoves = []; drawBoard(); return;
      }
      if (piece && colorOf(piece) === turn) { selected = [r, c]; validMoves = generateMoves(r, c, true); drawBoard(); }
    }

    function initGame() {
      board = INIT.map(r => [...r]);
      turn = 'w'; selected = null; validMoves = []; gameOver = false;
      captured = { w: [], b: [] }; moveLog = []; moveCount = 0;
      enPassantTarget = null; castlingRights = { K: true, Q: true, k: true, q: true };
      drawBoard();
    }

    // Event listeners
    const clickHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (S / rect.width);
      const my = (e.clientY - rect.top) * (S / rect.height);
      handleClick(mx, my);
    };
    canvas.addEventListener('click', clickHandler);

    const newGameBtn = document.getElementById('newGameBtn');
    const pvcBtn = document.getElementById('pvcBtn');
    newGameBtn?.addEventListener('click', initGame);
    pvcBtn?.addEventListener('click', () => {
      pvcMode = !pvcMode;
      if (pvcBtn) { pvcBtn.textContent = 'Play vs Computer: ' + (pvcMode ? 'ON' : 'OFF'); }
      initGame();
    });

    // Promotion modal
    document.querySelectorAll('.promo-opt').forEach(el => {
      el.addEventListener('click', () => {
        if (!pendingPromo) return;
        pendingPromo.flag = el.getAttribute('data-p');
        const modal = document.getElementById('promoModal');
        if (modal) modal.style.display = 'none';
        doMove(pendingPromo.fr, pendingPromo.fc, pendingPromo.tr, pendingPromo.tc, pendingPromo.flag);
        pendingPromo = null;
      });
    });

    const promoModal = document.getElementById('promoModal');
    promoModal?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { promoModal.style.display = 'none'; pendingPromo = null; }
    });

    initGame();

    return () => {
      canvas.removeEventListener('click', clickHandler);
      newGameBtn?.removeEventListener('click', initGame);
    };
  }, []);

  return (
    <div style={{
      background: '#1a1a2e', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'
    }}>
      <div style={{
        background: '#16213e', padding: 25, borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', gap: 25,
        alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center'
      }}>
        <canvas ref={canvasRef} width={480} height={480}
          style={{ borderRadius: 8, boxShadow: '0 0 30px rgba(233,69,96,0.15)', maxWidth: '100%', height: 'auto', cursor: 'pointer' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 170 }}>
          <div style={{ background: '#0f3460', borderRadius: 10, padding: 14, color: '#e0e0e0', fontSize: '0.9rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }} id="turnDisplay">White&apos;s turn</div>
            <div style={{ fontSize: '0.85rem', color: '#aaa' }} id="statusDisplay">Select a piece to move</div>
          </div>
          <div style={{ background: '#0f3460', borderRadius: 10, padding: '10px 14px', color: '#e0e0e0', fontSize: '0.8rem', minHeight: 40 }}>
            <div style={{ color: '#888', fontSize: '0.75rem' }}>Captured by White:</div>
            <div style={{ fontSize: '1.1rem', letterSpacing: 2 }} id="capWhite"></div>
            <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 4 }}>Captured by Black:</div>
            <div style={{ fontSize: '1.1rem', letterSpacing: 2 }} id="capBlack"></div>
          </div>
          <div style={{ background: '#0f3460', borderRadius: 10, padding: '10px 14px', color: '#e0e0e0', fontSize: '0.78rem', maxHeight: 120, overflowY: 'auto' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: 4 }}>Move history:</div>
            <div id="moveHistory"></div>
          </div>
          <button id="pvcBtn" style={{
            background: 'transparent', color: '#4ecca3', border: '2px solid #4ecca3',
            padding: 10, borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', width: '100%'
          }}>Play vs Computer: OFF</button>
          <button id="newGameBtn" style={{
            background: 'transparent', color: '#e94560', border: '2px solid #e94560',
            padding: 10, borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', width: '100%'
          }}>New Game</button>
          <Link href="/" style={{ color: '#888', fontSize: 12, textDecoration: 'none', textAlign: 'center' }}>&larr; Back to Portfolio</Link>
        </div>
      </div>

      <div id="promoModal" style={{ display: 'none', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#16213e', padding: 20, borderRadius: 16, textAlign: 'center', color: '#e0e0e0' }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Choose promotion:</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <div className="promo-opt" data-p="Q" style={{ fontSize: 48, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: '#0f3460' }}>&#9813;</div>
            <div className="promo-opt" data-p="R" style={{ fontSize: 48, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: '#0f3460' }}>&#9814;</div>
            <div className="promo-opt" data-p="B" style={{ fontSize: 48, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: '#0f3460' }}>&#9815;</div>
            <div className="promo-opt" data-p="N" style={{ fontSize: 48, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: '#0f3460' }}>&#9816;</div>
          </div>
        </div>
      </div>
    </div>
  );
}
