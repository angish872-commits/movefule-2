package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS008RetryableErrorScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_008",
        title = "Retryable Error",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_007,
        onNavigate = onNavigate,
    ) {
            MFNotice("Something went wrong","No confirmed data was overwritten. You can safely retry.","Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS008RetryableErrorScreenPreview() {
    MoveFuelTheme { SYS008RetryableErrorScreen {} }
}
