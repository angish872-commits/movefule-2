package com.movefuel.mufil2.ui.screens.auth

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun AUTH011OfflineAccountStateScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "AUTH_011",
        title = "Offline Account State",
        subtitle = "Secure account access and recovery.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.AUTH_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.AUTH_010,
        onNavigate = onNavigate,
    ) {
            MFNotice("Offline Account State", "Your local data remains safe while this account state is resolved.", "Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun AUTH011OfflineAccountStateScreenPreview() {
    MoveFuelTheme { AUTH011OfflineAccountStateScreen {} }
}
