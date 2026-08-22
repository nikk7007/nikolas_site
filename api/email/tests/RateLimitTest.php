<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class RateLimitTest extends TestCase
{
    // --- rate_limit_check ---

    public function testAllowsAndIncrementsBelowLimit(): void
    {
        $r = rate_limit_check(['windowStart' => 1000, 'count' => 3], 1010, 60);
        $this->assertTrue($r['allowed']);
        $this->assertSame(4, $r['count']);
        $this->assertSame(1000, $r['windowStart']);   // mesma janela
    }

    public function testDeniesAtLimit(): void
    {
        $r = rate_limit_check(['windowStart' => 1000, 'count' => 60], 1030, 60);
        $this->assertFalse($r['allowed']);
        $this->assertSame(60, $r['count']);           // não incrementa quando nega
        $this->assertSame(30, $r['retry']);           // 60 - (1030-1000)
    }

    public function testResetsAfterWindowExpires(): void
    {
        $r = rate_limit_check(['windowStart' => 1000, 'count' => 60], 1070, 60);
        $this->assertTrue($r['allowed']);
        $this->assertSame(1070, $r['windowStart']);   // nova janela
        $this->assertSame(1, $r['count']);
    }

    public function testEmptyStateStartsFresh(): void
    {
        $r = rate_limit_check([], 5000, 60);
        $this->assertTrue($r['allowed']);
        $this->assertSame(5000, $r['windowStart']);
        $this->assertSame(1, $r['count']);
    }

    public function testZeroLimitDisablesThrottle(): void
    {
        $r = rate_limit_check(['windowStart' => 1000, 'count' => 999], 1010, 0);
        $this->assertTrue($r['allowed']);
    }

    // --- map_resend_response ---

    public function testMapSuccessExtractsId(): void
    {
        $r = map_resend_response(200, '{"id":"abc-123"}');
        $this->assertTrue($r['ok']);
        $this->assertSame('abc-123', $r['id']);
    }

    public function testMapSuccessWithoutIdOrNullBody(): void
    {
        $this->assertSame('', map_resend_response(201, null)['id']);
        $this->assertSame('', map_resend_response(200, 'não json')['id']);
    }

    public function testMapFailureOnErrorCodes(): void
    {
        $this->assertFalse(map_resend_response(401, '{"error":"x"}')['ok']);
        $this->assertFalse(map_resend_response(500, null)['ok']);
        $this->assertFalse(map_resend_response(0, null)['ok']);
    }
}
