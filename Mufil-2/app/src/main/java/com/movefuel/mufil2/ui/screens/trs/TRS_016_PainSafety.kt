package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS016PainSafetyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_016",
        title = "Pain Safety",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_015,
        onNavigate = onNavigate,
    ) {
            MFNotice("Pain is separate from soreness","Pain routes into safety handling and is never treated as ordinary readiness input.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS016PainSafetyScreenPreview() {
    MoveFuelTheme { TRS016PainSafetyScreen {} }
}
